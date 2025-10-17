import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export interface StorageUploadResult {
  path: string;
  url: string;
  publicUrl?: string;
  thumbUrl?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.STORAGE_BUCKET ?? 'assets';

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials are not configured.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseClient;
}

export async function uploadFromBuffer(
  projectId: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageUploadResult> {
  if (!projectId) {
    throw new Error('Project ID is required for storage upload.');
  }

  const client = getClient();
  const objectPath = `${projectId}/${randomUUID()}-${filename}`;

  const { error } = await client.storage
    .from(storageBucket)
    .upload(objectPath, buffer, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload asset to storage: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from(storageBucket).getPublicUrl(objectPath);

  const url = `${supabaseUrl}/storage/v1/object/${storageBucket}/${objectPath}`;

  return {
    path: objectPath,
    url,
    publicUrl: publicUrlData?.publicUrl,
  };
}

export async function getSignedUrl(path: string, expiresInSeconds = 60 * 60): Promise<string> {
  if (!path) {
    throw new Error('A storage path must be provided for signing.');
  }

  const client = getClient();
  const { data, error } = await client.storage
    .from(storageBucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`);
  }

  return data.signedUrl;
}

export async function deletePath(path: string): Promise<void> {
  if (!path) {
    throw new Error('A storage path must be provided for deletion.');
  }

  const client = getClient();
  const { error } = await client.storage.from(storageBucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}
