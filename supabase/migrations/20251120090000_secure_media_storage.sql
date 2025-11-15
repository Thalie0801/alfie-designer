-- Ensure critical storage buckets are private and store signed URL metadata

-- 1. Make media-generations and chat-uploads buckets private
update storage.buckets
set public = false
where id in ('media-generations', 'chat-uploads');

-- 2. Drop legacy public READ policies that allowed anonymous access
DROP POLICY IF EXISTS "Anyone can view public media" ON storage.objects;
DROP POLICY IF EXISTS "Public files are viewable by everyone" ON storage.objects;

-- 3. Extend media_generations with storage metadata for signed URLs
ALTER TABLE public.media_generations
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_storage_bucket text,
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path text;

-- 4. Backfill storage metadata from historical public URLs when possible
UPDATE public.media_generations
SET
  storage_bucket = COALESCE(storage_bucket, 'media-generations'),
  storage_path = COALESCE(
    storage_path,
    NULLIF(
      split_part(
        regexp_replace(
          output_url,
          '^.*?/storage/v1/object/(?:public|sign)/media-generations/',
          ''
        ),
        '?',
        1
      ),
      ''
    )
  )
WHERE output_url ILIKE '%/storage/v1/object/%/media-generations/%';

UPDATE public.media_generations
SET
  thumbnail_storage_bucket = COALESCE(thumbnail_storage_bucket, 'media-generations'),
  thumbnail_storage_path = COALESCE(
    thumbnail_storage_path,
    NULLIF(
      split_part(
        regexp_replace(
          thumbnail_url,
          '^.*?/storage/v1/object/(?:public|sign)/media-generations/',
          ''
        ),
        '?',
        1
      ),
      ''
    )
  )
WHERE thumbnail_url ILIKE '%/storage/v1/object/%/media-generations/%';

-- 5. Keep storage metadata in sync when rows are inserted/updated without explicit values
CREATE OR REPLACE FUNCTION public.media_generations_sync_storage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_bucket IS NULL AND NEW.output_url ILIKE '%/storage/v1/object/%/media-generations/%' THEN
    NEW.storage_bucket := 'media-generations';
    NEW.storage_path := NULLIF(
      split_part(
        regexp_replace(
          NEW.output_url,
          '^.*?/storage/v1/object/(?:public|sign)/media-generations/',
          ''
        ),
        '?',
        1
      ),
      ''
    );
  END IF;

  IF NEW.thumbnail_storage_bucket IS NULL AND NEW.thumbnail_url ILIKE '%/storage/v1/object/%/media-generations/%' THEN
    NEW.thumbnail_storage_bucket := 'media-generations';
    NEW.thumbnail_storage_path := NULLIF(
      split_part(
        regexp_replace(
          NEW.thumbnail_url,
          '^.*?/storage/v1/object/(?:public|sign)/media-generations/',
          ''
        ),
        '?',
        1
      ),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_generations_sync_storage_trg ON public.media_generations;
CREATE TRIGGER media_generations_sync_storage_trg
  BEFORE INSERT OR UPDATE ON public.media_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.media_generations_sync_storage();
