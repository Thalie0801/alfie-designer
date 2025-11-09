import type { NextApiRequest, NextApiResponse } from "next";
import { getLovableCookieMaxAgeSeconds } from "../../../src/lib/lovableToken";

const COOKIE_NAME = "lovable-session";

function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  const fromHeader =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

  if (fromHeader) {
    return fromHeader || null;
  }

  const body =
    typeof req.body === "string"
      ? safeJsonParse<{ token?: string }>(req.body)
      : (req.body as { token?: string } | undefined);

  if (body && typeof body.token === "string" && body.token.trim()) {
    return body.token.trim();
  }

  return null;
}

function safeJsonParse<T>(payload: string): T | undefined {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return undefined;
  }
}

function buildCookieHeader(token: string) {
  const maxAge = getLovableCookieMaxAgeSeconds();
  const base = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${base}${secure}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(400).json({ error: "lovable_token_required" });
  }

  res.setHeader("Set-Cookie", buildCookieHeader(token));
  res.setHeader("Cache-Control", "no-store");
  return res.status(204).end();
}
