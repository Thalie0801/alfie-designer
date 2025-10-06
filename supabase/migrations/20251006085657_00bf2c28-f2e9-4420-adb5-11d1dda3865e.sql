-- Phase 1: Ajouter les colonnes de crédits dans profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_credits_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_from_affiliation INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Phase 2: Créer la table credit_packs
CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS sur credit_packs
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

-- Politique : tous peuvent voir les packs
CREATE POLICY "Anyone can view credit packs"
  ON credit_packs FOR SELECT
  USING (true);

-- Phase 3: Insérer les packs de crédits (avec des price_id temporaires à remplacer)
INSERT INTO credit_packs (name, credits, price_cents, stripe_price_id, discount_percentage) VALUES
('Pack 20 crédits', 20, 1900, 'price_pack20_placeholder', 0),
('Pack 50 crédits', 50, 3900, 'price_pack50_placeholder', 20),
('Pack 100 crédits', 100, 6900, 'price_pack100_placeholder', 0),
('Pack 500 crédits', 500, 29900, 'price_pack500_placeholder', 0);

-- Phase 4: Créer la table credit_transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('monthly_reset', 'purchase', 'affiliation_conversion', 'usage')),
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS sur credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());