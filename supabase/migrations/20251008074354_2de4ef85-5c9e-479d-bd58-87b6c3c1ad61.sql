-- Ajouter une colonne pour compter les générations du mois
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS generations_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generations_reset_date TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', now() + interval '1 month');