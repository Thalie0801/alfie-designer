-- Add storage metadata columns for Supabase buckets used by generated media
ALTER TABLE public.media_generations
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.library_assets
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;
