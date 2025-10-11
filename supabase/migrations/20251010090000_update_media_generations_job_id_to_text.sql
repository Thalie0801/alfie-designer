-- Support provider job identifiers that are not UUIDs
ALTER TABLE media_generations
  ALTER COLUMN job_id TYPE text USING job_id::text;

CREATE INDEX IF NOT EXISTS media_generations_job_id_idx
  ON media_generations (job_id);

-- Update comment to reflect new Woof pricing
COMMENT ON COLUMN public.media_generations.engine IS 'Moteur utilisé: nano (image), sora (vidéo 2 Woofs), veo3 (vidéo 4 Woofs)';
COMMENT ON COLUMN public.profiles.woofs_consumed_this_month IS 'Nombre de Woofs consommés ce mois (Sora=2, Veo3=4)';
COMMENT ON COLUMN public.brands.quota_woofs IS 'Quota mensuel de Woofs (15/45/100, Sora=2, Veo3=4)';
COMMENT ON COLUMN public.brands.woofs_used IS 'Woofs consommés ce mois (Sora=2, Veo3=4)';
