import type { NextApiRequest, NextApiResponse } from "next";

import {
  collectAllowedOrigins,
  resolveAllowedOrigin,
  setCorsHeaders,
} from "./_utils";

const COOKIE_NAME = "lovable_session";
const ONE_HOUR = 60 * 60;

function buildCookie(value: string, maxAgeSeconds: number): string {
  const attributes = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearCookie(): string {
  const attributes = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }
  return attributes.join("; ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const allowedOrigins = collectAllowedOrigins(req.headers.host);
  const { allowedOrigin, varyHeader } = resolveAllowedOrigin(req, allowedOrigins);

  if (req.method === "OPTIONS") {
    if (!allowedOrigin && req.headers.origin) {
      setCorsHeaders(res, null, varyHeader, "OPTIONS,POST,DELETE");
      res.status(403).json({ error: "origin_not_allowed" });
      return;
    }

    setCorsHeaders(res, allowedOrigin, varyHeader, "OPTIONS,POST,DELETE");
    res.status(204).end();
    return;
  }

  if (req.headers.origin && !allowedOrigin) {
    setCorsHeaders(res, null, varyHeader, "OPTIONS,POST,DELETE");
    res.status(403).json({ error: "origin_not_allowed" });
    return;
  }

  setCorsHeaders(res, allowedOrigin, varyHeader, "OPTIONS,POST,DELETE");

  if (req.method === "POST") {
    const body = req.body as { token?: unknown } | undefined;
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      res.status(400).json({ error: "missing_token" });
      return;
    }

    const encodedValue = encodeURIComponent(token);
    res.setHeader("Set-Cookie", buildCookie(encodedValue, ONE_HOUR));
    res.status(204).end();
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie());
    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "OPTIONS,POST,DELETE");
  res.status(405).end();
}
