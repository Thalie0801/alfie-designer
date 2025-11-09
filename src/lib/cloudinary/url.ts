const CLOUDINARY_HOST = "res.cloudinary.com";

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeUrl(raw?: string | null): string | null {
  if (!isString(raw)) return null;
  return raw.trim();
}

function isCloudinaryUrl(url: string): boolean {
  if (!isString(url)) return false;
  try {
    const { hostname } = new URL(url);
    return hostname.includes(CLOUDINARY_HOST);
  } catch {
    return false;
  }
}

function injectTransformation(url: string, transformation: string): string {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;

  const prefix = url.slice(0, index + marker.length);
  const suffix = url.slice(index + marker.length);

  if (!suffix) return `${prefix}${transformation}`;

  if (suffix.startsWith(`${transformation}/`)) {
    return url;
  }

  return `${prefix}${transformation}/${suffix}`;
}

function qualitySegment(quality?: number | string): string {
  if (typeof quality === "number" && Number.isFinite(quality)) {
    const clamped = Math.min(100, Math.max(1, Math.round(quality)));
    return `q_${clamped}`;
  }

  if (typeof quality === "string" && quality.trim()) {
    const q = quality.trim();
    return q.startsWith("q_") ? q : `q_${q}`;
  }

  return "q_auto:eco";
}

export interface ThumbOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "scale" | string;
  format?: "auto" | "jpg" | "png" | "webp" | string;
  quality?: number | string;
  gravity?: "auto" | string;
  type?: "image" | "video";
}

export function toThumbUrl(url?: string | null, options: ThumbOptions = {}): string | undefined {
  const normalized = normalizeUrl(url);
  if (!normalized) return undefined;
  if (!isCloudinaryUrl(normalized)) return normalized;

  const width = Math.max(1, Math.round(options.width ?? 720));
  const crop = options.crop ?? "fill";
  const format = options.format ?? "auto";
  const gravity = options.gravity;
  const height = options.height;
  const quality = qualitySegment(options.quality);
  const videoSegment = options.type === "video" ? "so_0" : undefined;

  const segments = [`f_${format}`, quality, `c_${crop}`, `w_${width}`];
  if (typeof height === "number" && Number.isFinite(height) && height > 0) {
    segments.push(`h_${Math.round(height)}`);
  }
  if (gravity) {
    segments.push(`g_${gravity}`);
  }
  if (videoSegment) {
    segments.push(videoSegment);
  }

  const transformation = segments.filter(Boolean).join(",");
  return injectTransformation(normalized, transformation);
}

export interface DownloadOptions {
  filename?: string;
}

export function toDownloadUrl(url?: string | null, options: DownloadOptions = {}): string | undefined {
  const normalized = normalizeUrl(url);
  if (!normalized) return undefined;

  if (!isCloudinaryUrl(normalized)) {
    return normalized;
  }

  if (normalized.includes("fl_attachment")) {
    return normalized;
  }

  const [base, hash] = normalized.split("#");
  const separator = base.includes("?") ? "&" : "?";
  const attachment = options.filename
    ? `fl_attachment=${encodeURIComponent(options.filename)}`
    : "fl_attachment";
  const withAttachment = `${base}${separator}${attachment}`;
  return hash ? `${withAttachment}#${hash}` : withAttachment;
}

export function ensureCloudinaryUrl(url?: string | null): string | undefined {
  const normalized = normalizeUrl(url);
  if (!normalized) return undefined;
  return isCloudinaryUrl(normalized) ? normalized : undefined;
}
