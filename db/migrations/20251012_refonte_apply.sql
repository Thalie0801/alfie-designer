-- Refonte V1 — Migrations idempotentes (si tables manquantes)
CREATE TABLE IF NOT EXISTS brand (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('Starter','Pro','Studio')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counters_monthly (
  brand_id UUID NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  period_yyyymm INT NOT NULL,
  images_used INT NOT NULL DEFAULT 0,
  reels_used INT NOT NULL DEFAULT 0,
  woofs_used INT NOT NULL DEFAULT 0,
  PRIMARY KEY (brand_id, period_yyyymm)
);
CREATE INDEX IF NOT EXISTS idx_counters_monthly_brand_period ON counters_monthly(brand_id, period_yyyymm);

CREATE TABLE IF NOT EXISTS deliverable (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('image','carousel','reel')),
  objective TEXT,
  style_choice TEXT CHECK (style_choice IN ('template_canva','ia')),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|awaiting_premium_confirmation|queued|processing|ready|failed
  preview_url TEXT,
  canva_link TEXT,
  zip_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_brand ON deliverable(brand_id);

CREATE OR REPLACE FUNCTION trg_deliverable_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='deliverable_updated_at') THEN
    CREATE TRIGGER deliverable_updated_at BEFORE UPDATE ON deliverable
    FOR EACH ROW EXECUTE PROCEDURE trg_deliverable_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS usage_event (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverable(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image_ai','carousel_ai_image','reel_export','premium_t2v')),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_event_brand_created ON usage_event(brand_id, created_at);

-- Helpers
CREATE OR REPLACE FUNCTION yyyymm(ts TIMESTAMPTZ) RETURNS INT AS $$
BEGIN RETURN EXTRACT(YEAR FROM ts)::INT*100 + EXTRACT(MONTH FROM ts)::INT; END $$ LANGUAGE plpgsql;

-- Incrément compteur mensuel (idempotent)
CREATE OR REPLACE FUNCTION increment_counters(p_brand UUID, d_images INT, d_reels INT, d_woofs INT)
RETURNS VOID AS $$
DECLARE p INT := yyyymm(now());
BEGIN
  INSERT INTO counters_monthly(brand_id, period_yyyymm, images_used, reels_used, woofs_used)
  VALUES (p_brand, p, 0,0,0)
  ON CONFLICT (brand_id, period_yyyymm) DO NOTHING;
  UPDATE counters_monthly
    SET images_used = images_used + COALESCE(d_images,0),
        reels_used  = reels_used  + COALESCE(d_reels,0),
        woofs_used  = woofs_used  + COALESCE(d_woofs,0)
  WHERE brand_id = p_brand AND period_yyyymm = p;
END $$ LANGUAGE plpgsql;
