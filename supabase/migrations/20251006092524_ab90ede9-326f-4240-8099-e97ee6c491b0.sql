-- Table pour le cache des réponses Alfie (optimisation coûts IA)
CREATE TABLE IF NOT EXISTS alfie_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt_type TEXT NOT NULL, -- 'browse_templates', 'brandkit_info', 'general'
  response JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour lookup rapide
CREATE INDEX idx_alfie_cache_prompt_hash ON alfie_cache(prompt_hash);
CREATE INDEX idx_alfie_cache_type ON alfie_cache(prompt_type);

-- Ajouter colonnes de rate limiting pour Alfie dans profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS alfie_requests_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alfie_requests_reset_date TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', now() + interval '1 month');

-- Fonction pour incrémenter le compteur de requêtes Alfie
CREATE OR REPLACE FUNCTION increment_alfie_requests(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  reset_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT alfie_requests_this_month, alfie_requests_reset_date 
  INTO current_count, reset_date
  FROM profiles
  WHERE id = user_id_param;
  
  -- Reset si on a dépassé la date
  IF reset_date < now() THEN
    UPDATE profiles
    SET 
      alfie_requests_this_month = 1,
      alfie_requests_reset_date = date_trunc('month', now() + interval '1 month')
    WHERE id = user_id_param;
    RETURN 1;
  END IF;
  
  -- Sinon incrémenter
  UPDATE profiles
  SET alfie_requests_this_month = alfie_requests_this_month + 1
  WHERE id = user_id_param;
  
  RETURN current_count + 1;
END;
$$;

-- RLS pour alfie_cache (lecture publique, écriture admin)
ALTER TABLE alfie_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
ON alfie_cache FOR SELECT
USING (true);

CREATE POLICY "Service role can write cache"
ON alfie_cache FOR ALL
USING (auth.uid() IS NOT NULL);