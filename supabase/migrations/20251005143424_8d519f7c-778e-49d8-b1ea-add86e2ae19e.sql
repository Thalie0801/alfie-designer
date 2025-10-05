-- Modifier le plan par défaut pour qu'il soit null (pas de plan actif)
ALTER TABLE public.profiles 
ALTER COLUMN plan SET DEFAULT null,
ALTER COLUMN quota_brands SET DEFAULT 0,
ALTER COLUMN quota_visuals_per_month SET DEFAULT 0;

-- Créer une fonction pour vérifier si un utilisateur a un plan actif
CREATE OR REPLACE FUNCTION public.has_active_plan(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id_param
      AND plan IS NOT NULL
      AND plan != 'none'
  )
$$;