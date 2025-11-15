-- Ensure SECURITY DEFINER functions run with a controlled search_path
CREATE OR REPLACE FUNCTION public.increment_brand_usage(p_brand_id uuid, p_videos int, p_woofs int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brands
  SET videos_used = COALESCE(videos_used, 0) + p_videos,
      woofs_used  = COALESCE(woofs_used, 0) + p_woofs
  WHERE id = p_brand_id
    AND (COALESCE(videos_used, 0) + p_videos) <= quota_videos
    AND (COALESCE(woofs_used, 0)  + p_woofs)  <= quota_woofs;

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_brand_usage(uuid, int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_profile_visuals(p_profile_id uuid, p_delta int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  UPDATE profiles
  SET visuals_month = CASE
        WHEN COALESCE(visuals_month_key, '') = current_month THEN COALESCE(visuals_month, 0) + p_delta
        ELSE p_delta
      END,
      visuals_month_key = current_month
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_visuals(uuid, int) TO authenticated, service_role;
