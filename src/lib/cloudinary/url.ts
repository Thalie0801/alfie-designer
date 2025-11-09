// Récupère le cloudName depuis une URL Cloudinary
export function getCloudFromUrl(url: string): string | null {
  const m = url.match(/res\.cloudinary\.com\/([^/]+)/i);
  return m?.[1] ?? null;
}

// Construit une miniature légère (pas de recadrage dur, juste fit)
export function toThumbUrl(url: string, w = 600): string {
  if (!/^https?:\/\/res\.cloudinary\.com\//.test(url)) return url;
  return url.replace(/\/image\/upload\/([^/]+\/)*/i, `/image/upload/c_limit,w_${w}/`);
}

// Retire TOUTES les transformations pour pointer sur l’original
export function toOriginalUrl(url: string): string {
  if (!/^https?:\/\/res\.cloudinary\.com\//.test(url)) return url;
  // .../image/upload/TRANSFO/RESTE -> .../image/upload/RESTE
  return url.replace(/(\/image\/upload)\/[^/]+(\/.*)/i, `$1$2`);
}

// Ajoute seulement fl_attachment pour forcer le download
export function toDownloadUrl(url: string): string {
  const clean = toOriginalUrl(url);
  return `${clean}${clean.includes("?") ? "&" : "?"}fl_attachment`;
}
