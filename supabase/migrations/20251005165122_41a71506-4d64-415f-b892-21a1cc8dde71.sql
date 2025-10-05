-- Ajouter les colonnes Stripe Connect à la table affiliates
ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false;