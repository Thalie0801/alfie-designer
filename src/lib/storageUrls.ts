import { supabase } from "@/integrations/supabase/client";

type CacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, CacheEntry>();

function buildKey(bucket: string, path: string) {
  return `${bucket}:${path}`;
}

function getDefaultExpiry(expiresIn: number, explicitExpiration?: number) {
  if (explicitExpiration && Number.isFinite(explicitExpiration)) {
    return explicitExpiration * 1000;
  }
  return Date.now() + expiresIn * 1000;
}

export function invalidateSignedUrl(bucket: string, path: string) {
  signedUrlCache.delete(buildKey(bucket, path));
}

export async function getSignedUrlForStorageObject(
  bucket: string,
  path: string,
  expiresIn = 60 * 60,
) {
  if (!bucket || !path) return null;
  const key = buildKey(bucket, path);
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 5000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.warn("[storageUrls] Unable to create signed URL", { bucket, path, error });
    return null;
  }

  const expiresAt = getDefaultExpiry(expiresIn, data.expiration || data.expiresAt);
  signedUrlCache.set(key, { url: data.signedUrl, expiresAt });
  return data.signedUrl;
}
