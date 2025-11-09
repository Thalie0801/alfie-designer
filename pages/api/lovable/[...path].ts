import type { NextApiRequest, NextApiResponse } from "next";

import {
  collectAllowedOrigins,
  resolveAllowedOrigin,
  setCorsHeaders,
} from "./_utils";

const LOVABLE_API_ORIGIN = (process.env.LOVABLE_API_ORIGIN ?? "https://api.lovable.dev").replace(/\/$/, "");
const COOKIE_NAME = "lovable_session";

const ALLOWED_METHODS = "OPTIONS,GET,POST,PUT,PATCH,DELETE";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "transfer-encoding",
  "host",
  "accept-encoding",
  "authorization",
  "cookie",
]);

function ensureProjectId(segments: string[]): string | null {
  const index = segments.findIndex((segment) => segment === "projects");
  if (index === -1) return "";
  const projectId = segments[index + 1];
  if (projectId === undefined || projectId === "") {
    return null;
  }
  return projectId;
}

function encodeSegments(segments: string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

function buildTargetUrl(req: NextApiRequest, pathSegments: string[]): string {
  const searchIndex = req.url?.indexOf("?") ?? -1;
  const search = searchIndex >= 0 ? req.url!.slice(searchIndex) : "";
  return `${LOVABLE_API_ORIGIN}/${encodeSegments(pathSegments)}${search}`;
}

function extractToken(req: NextApiRequest): string | null {
  const envToken =
    process.env.LOVABLE_API_TOKEN ?? process.env.LOVABLE_SERVER_TOKEN ?? process.env.LOVABLE_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }

  const rawCookie = req.cookies?.[COOKIE_NAME];
  if (typeof rawCookie === "string" && rawCookie.trim()) {
    try {
      return decodeURIComponent(rawCookie.trim());
    } catch {
      return rawCookie.trim();
    }
  }

  return null;
}

function prepareRequestBody(req: NextApiRequest): BodyInit | undefined {
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return undefined;
  }

  const contentTypeHeader = req.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader)
    ? contentTypeHeader[0]
    : contentTypeHeader || "";

  if (!req.body || Object.keys(req.body).length === 0) {
    return undefined;
  }

  if (typeof req.body === "string" || req.body instanceof Buffer) {
    return req.body as BodyInit;
  }

  if (contentType.includes("application/json")) {
    return JSON.stringify(req.body);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams();
    Object.entries(req.body as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }

  if (!contentType) {
    return JSON.stringify(req.body);
  }

  throw new Error(`Unsupported content-type: ${contentType}`);
}

function buildForwardHeaders(req: NextApiRequest, hasBody: boolean): Headers {
  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    if (value === undefined) return;
    const normalizedKey = key.toLowerCase();
    if (Array.isArray(value)) {
      headers.set(normalizedKey, value.join(","));
    } else {
      headers.set(normalizedKey, value);
    }
  });

  if (!hasBody) {
    headers.delete("content-type");
  }

  return headers;
}

function relayResponse(res: NextApiResponse, upstream: Response) {
  const rawHeaders = (upstream.headers as unknown as { raw(): Record<string, string[]> }).raw();

  Object.entries(rawHeaders).forEach(([key, values]) => {
    if (!values || values.length === 0) return;
    if (key.toLowerCase() === "set-cookie") {
      res.setHeader(key, values);
      return;
    }
    res.setHeader(key, values.length === 1 ? values[0] : values);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const allowedOrigins = collectAllowedOrigins(req.headers.host);
  const { allowedOrigin, varyHeader } = resolveAllowedOrigin(req, allowedOrigins);

  if (req.method === "OPTIONS") {
    if (!allowedOrigin && req.headers.origin) {
      setCorsHeaders(res, null, varyHeader, ALLOWED_METHODS);
      res.status(403).json({ error: "origin_not_allowed" });
      return;
    }

    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(204).end();
    return;
  }

  if (req.headers.origin && !allowedOrigin) {
    setCorsHeaders(res, null, varyHeader, ALLOWED_METHODS);
    res.status(403).json({ error: "origin_not_allowed" });
    return;
  }

  const rawSegments = req.query.path;
  const segmentsArray = Array.isArray(rawSegments)
    ? rawSegments
    : typeof rawSegments === "string"
      ? [rawSegments]
      : [];
  const sanitizedSegments = segmentsArray.map((segment) => (segment ?? "").trim());

  if (sanitizedSegments.length === 0 || sanitizedSegments.every((segment) => segment === "")) {
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(400).json({ error: "missing_path" });
    return;
  }

  if (sanitizedSegments.some((segment) => segment === "")) {
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(400).json({ error: "invalid_path_segment" });
    return;
  }

  const projectId = ensureProjectId(sanitizedSegments);
  if (projectId === null) {
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(400).json({ error: "missing_project_id" });
    return;
  }

  const targetUrl = buildTargetUrl(req, sanitizedSegments);
  const token = extractToken(req);

  if (!token) {
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(401).json({ error: "lovable_token_unavailable" });
    return;
  }

  let body: BodyInit | undefined;
  try {
    body = prepareRequestBody(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unsupported_content_type";
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(415).json({ error: message });
    return;
  }

  const headers = buildForwardHeaders(req, Boolean(body));
  headers.set("Authorization", `Bearer ${token}`);
  if (body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const buffer = await upstream.arrayBuffer();

    relayResponse(res, upstream);
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(upstream.status);
    res.send(Buffer.from(buffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "proxy_error";
    setCorsHeaders(res, allowedOrigin, varyHeader, ALLOWED_METHODS);
    res.status(502).json({ error: message });
  }
}
