-- Ajout des champs MLM à la table affiliates
ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES affiliates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS affiliate_status text DEFAULT 'creator' CHECK (affiliate_status IN ('creator', 'mentor', 'leader')),
ADD COLUMN IF NOT EXISTS active_direct_referrals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals_level_2 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals_level_3 integer DEFAULT 0;

-- Créer un index pour les recherches par parent
CREATE INDEX IF NOT EXISTS idx_affiliates_parent_id ON affiliates(parent_id);

-- Table pour stocker les commissions par niveau
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  conversion_id uuid NOT NULL REFERENCES affiliate_conversions(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level IN (1, 2, 3)),
  commission_rate numeric NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(affiliate_id, conversion_id, level)
);

-- Index pour les requêtes de commissions
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_conversion ON affiliate_commissions(conversion_id);

-- Activer RLS sur la table des commissions
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les affiliés peuvent voir leurs propres commissions
CREATE POLICY "Affiliates can view their own commissions"
ON affiliate_commissions
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM affiliates WHERE email = (SELECT auth.jwt() ->> 'email')
  )
);

-- Fonction pour calculer et attribuer les commissions MLM
CREATE OR REPLACE FUNCTION calculate_mlm_commissions(conversion_id_param uuid, direct_affiliate_id uuid, conversion_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_affiliate_id uuid;
  current_level integer := 1;
  commission_rate numeric;
  commission_amount numeric;
  affiliate_record record;
BEGIN
  current_affiliate_id := direct_affiliate_id;
  
  -- Parcourir les 3 niveaux
  WHILE current_affiliate_id IS NOT NULL AND current_level <= 3 LOOP
    SELECT * INTO affiliate_record FROM affiliates WHERE id = current_affiliate_id;
    
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    -- Déterminer le taux de commission selon le niveau et le statut
    IF current_level = 1 THEN
      -- Niveau 1: 15% (tous les affiliés actifs)
      IF affiliate_record.status = 'active' THEN
        commission_rate := 0.15;
      ELSE
        commission_rate := 0;
      END IF;
    ELSIF current_level = 2 THEN
      -- Niveau 2: 5% (seulement si Mentor ou Leader avec ≥3 filleuls)
      IF affiliate_record.affiliate_status IN ('mentor', 'leader') AND affiliate_record.active_direct_referrals >= 3 THEN
        commission_rate := 0.05;
      ELSE
        commission_rate := 0;
      END IF;
    ELSIF current_level = 3 THEN
      -- Niveau 3: 2% (seulement si Leader avec ≥5 filleuls)
      IF affiliate_record.affiliate_status = 'leader' AND affiliate_record.active_direct_referrals >= 5 THEN
        commission_rate := 0.02;
      ELSE
        commission_rate := 0;
      END IF;
    END IF;
    
    -- Créer la commission si le taux > 0
    IF commission_rate > 0 THEN
      commission_amount := conversion_amount * commission_rate;
      
      INSERT INTO affiliate_commissions (affiliate_id, conversion_id, level, commission_rate, amount)
      VALUES (current_affiliate_id, conversion_id_param, current_level, commission_rate, commission_amount)
      ON CONFLICT (affiliate_id, conversion_id, level) DO NOTHING;
    END IF;
    
    -- Passer au niveau suivant (parent)
    current_affiliate_id := affiliate_record.parent_id;
    current_level := current_level + 1;
  END LOOP;
END;
$$;

-- Fonction pour mettre à jour le statut d'un affilié selon ses filleuls actifs
CREATE OR REPLACE FUNCTION update_affiliate_status(affiliate_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  direct_referrals integer;
  new_status text;
BEGIN
  -- Compter les filleuls directs actifs (ayant au moins une conversion payée)
  SELECT COUNT(DISTINCT a.id) INTO direct_referrals
  FROM affiliates a
  JOIN affiliate_conversions ac ON ac.affiliate_id = a.id
  WHERE a.parent_id = affiliate_id_param
    AND a.status = 'active'
    AND ac.status = 'paid';
  
  -- Déterminer le nouveau statut
  IF direct_referrals >= 5 THEN
    new_status := 'leader';
  ELSIF direct_referrals >= 3 THEN
    new_status := 'mentor';
  ELSE
    new_status := 'creator';
  END IF;
  
  -- Mettre à jour
  UPDATE affiliates
  SET 
    affiliate_status = new_status,
    active_direct_referrals = direct_referrals
  WHERE id = affiliate_id_param;
END;
$$;