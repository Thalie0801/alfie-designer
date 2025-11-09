import type { NextApiRequest, NextApiResponse } from "next";

type AllowedOriginResult = {
  allowedOrigin: string | null;
  varyHeader: string | null;
};

const LOCALHOST_REGEX = /localhost|127\.0\.0\.1|^\[::1\]$/;

export function guessOriginFromHost(host?: string | null): string | null {
  if (!host) return null;
  const normalizedHost = host.trim();
  if (!normalizedHost) return null;
  const protocol = LOCALHOST_REGEX.test(normalizedHost) ? "http" : "https";
  return `${protocol}://${normalizedHost}`;
}

export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export function collectAllowedOrigins(host?: string | null): string[] {
  const raw = [
    process.env.APP_ALLOWED_ORIGINS,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_ORIGIN,
  ];

  const normalized = raw
    .flatMap((entry) => (entry ? entry.split(",") : []))
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  const hostOrigin = normalizeOrigin(guessOriginFromHost(host));
  if (hostOrigin) {
    normalized.push(hostOrigin);
  }

  return Array.from(new Set(normalized));
}

export function resolveAllowedOrigin(req: NextApiRequest, allowedOrigins: string[]): AllowedOriginResult {
  const originHeader = req.headers.origin || null;
  if (!originHeader) {
    return { allowedOrigin: null, varyHeader: null };
  }

  const normalized = normalizeOrigin(originHeader);
  if (normalized && allowedOrigins.includes(normalized)) {
    return { allowedOrigin: originHeader, varyHeader: "Origin" };
  }

  return { allowedOrigin: null, varyHeader: "Origin" };
}

export function setCorsHeaders(
  res: NextApiResponse,
  origin: string | null,
  vary: string | null,
  methods: string,
  allowedHeaders = "content-type, authorization",
) {
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (vary) {
    const existing = res.getHeader("Vary");
    const next = existing ? `${existing}, ${vary}` : vary;
    res.setHeader("Vary", next);
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
}
