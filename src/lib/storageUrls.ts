import { supabase } from "@/integrations/supabase/client";

export async function getSignedMediaUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
  fallbackUrl?: string | null,
): Promise<string | null> {
  if (bucket && path) {
    const normalizedPath = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, 60 * 60);

    if (!error && data?.signedUrl) return data.signedUrl;
    console.error("[storage] unable to create signed url", { bucket, path, error });
  }
  return fallbackUrl ?? null;
}
