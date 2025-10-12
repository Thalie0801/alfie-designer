-- Ajoute deliverable.meta (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='deliverable' AND column_name='meta'
  ) THEN
    ALTER TABLE deliverable ADD COLUMN meta JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
