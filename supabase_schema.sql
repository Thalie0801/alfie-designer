-- Alfie Designer consolidated Supabase schema
-- Generated to bootstrap a fresh Supabase instance outside Lovable Cloud.
-- This script is idempotent when run on an empty project.

BEGIN;

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'affiliate');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_engine') THEN
    CREATE TYPE public.asset_engine AS ENUM ('nano', 'sora', 'veo3');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brand_plan') THEN
    CREATE TYPE public.brand_plan AS ENUM ('starter', 'pro', 'studio');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE public.plan_type AS ENUM ('starter', 'pro', 'studio');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_engine') THEN
    CREATE TYPE public.video_engine AS ENUM ('sora', 'seededance', 'kling');
  END IF;
END $$;

-- Utility functions -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_plan(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id_param
      AND plan IS NOT NULL
      AND plan <> 'none'
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_short_job_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'JOB-';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_job_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := public.generate_short_job_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_mlm_commissions(
  conversion_id_param UUID,
  direct_affiliate_id UUID,
  conversion_amount NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_affiliate_id UUID;
  current_level INTEGER := 1;
  commission_rate NUMERIC;
  commission_amount NUMERIC;
  affiliate_record RECORD;
BEGIN
  current_affiliate_id := direct_affiliate_id;

  WHILE current_affiliate_id IS NOT NULL AND current_level <= 3 LOOP
    SELECT * INTO affiliate_record FROM affiliates WHERE id = current_affiliate_id;
    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF current_level = 1 THEN
      commission_rate := CASE WHEN affiliate_record.status = 'active' THEN 0.15 ELSE 0 END;
    ELSIF current_level = 2 THEN
      commission_rate := CASE
        WHEN affiliate_record.affiliate_status IN ('mentor', 'leader')
             AND affiliate_record.active_direct_referrals >= 3 THEN 0.05
        ELSE 0
      END;
    ELSE
      commission_rate := CASE
        WHEN affiliate_record.affiliate_status = 'leader'
             AND affiliate_record.active_direct_referrals >= 5 THEN 0.02
        ELSE 0
      END;
    END IF;

    IF commission_rate > 0 THEN
      commission_amount := conversion_amount * commission_rate;
      INSERT INTO affiliate_commissions (affiliate_id, conversion_id, level, commission_rate, amount)
      VALUES (current_affiliate_id, conversion_id_param, current_level, commission_rate, commission_amount)
      ON CONFLICT (affiliate_id, conversion_id, level) DO NOTHING;
    END IF;

    current_affiliate_id := affiliate_record.parent_id;
    current_level := current_level + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_affiliate_status(affiliate_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  direct_referrals INTEGER;
  new_status TEXT;
BEGIN
  SELECT COUNT(DISTINCT a.id)
    INTO direct_referrals
    FROM affiliates a
    JOIN affiliate_conversions ac ON ac.affiliate_id = a.id
    WHERE a.parent_id = affiliate_id_param
      AND a.status = 'active'
      AND ac.status = 'paid';

  IF direct_referrals >= 5 THEN
    new_status := 'leader';
  ELSIF direct_referrals >= 3 THEN
    new_status := 'mentor';
  ELSE
    new_status := 'creator';
  END IF;

  UPDATE affiliates
  SET affiliate_status = new_status,
      active_direct_referrals = direct_referrals
  WHERE id = affiliate_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_alfie_requests(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  reset_date TIMESTAMPTZ;
BEGIN
  SELECT alfie_requests_this_month, alfie_requests_reset_date
    INTO current_count, reset_date
    FROM profiles
    WHERE id = user_id_param;

  IF reset_date IS NULL OR reset_date < NOW() THEN
    UPDATE profiles
    SET
      alfie_requests_this_month = 1,
      alfie_requests_reset_date = date_trunc('month', NOW() + INTERVAL '1 month')
    WHERE id = user_id_param;
    RETURN 1;
  END IF;

  UPDATE profiles
  SET alfie_requests_this_month = COALESCE(alfie_requests_this_month, 0) + 1
  WHERE id = user_id_param;

  RETURN COALESCE(current_count, 0) + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_monthly_counters(
  p_brand_id UUID,
  p_period_yyyymm INT,
  p_images INT DEFAULT 0,
  p_reels INT DEFAULT 0,
  p_woofs INT DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO counters_monthly (brand_id, period_yyyymm, images_used, reels_used, woofs_used)
  VALUES (p_brand_id, p_period_yyyymm, p_images, p_reels, p_woofs)
  ON CONFLICT (brand_id, period_yyyymm)
  DO UPDATE SET
    images_used = counters_monthly.images_used + EXCLUDED.images_used,
    reels_used = counters_monthly.reels_used + EXCLUDED.reels_used,
    woofs_used = counters_monthly.woofs_used + EXCLUDED.woofs_used;
END;
$$;

-- Table definitions -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  plan TEXT,
  quota_visuals_per_month INTEGER DEFAULT 0,
  quota_brands INTEGER DEFAULT 0,
  quota_videos INTEGER DEFAULT 0,
  quota_woofs INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  credits_reset_date TIMESTAMPTZ,
  generations_reset_date TIMESTAMPTZ,
  generations_this_month INTEGER DEFAULT 0,
  ai_credits_monthly INTEGER DEFAULT 0,
  ai_credits_purchased INTEGER DEFAULT 0,
  ai_credits_from_affiliation INTEGER DEFAULT 0,
  videos_this_month INTEGER DEFAULT 0,
  woofs_consumed_this_month INTEGER DEFAULT 0,
  alfie_requests_this_month INTEGER DEFAULT 0,
  alfie_requests_reset_date TIMESTAMPTZ,
  active_brand_id UUID
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  payout_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  affiliate_status TEXT DEFAULT 'creator',
  active_direct_referrals INTEGER DEFAULT 0,
  total_referrals_level_2 INTEGER DEFAULT 0,
  total_referrals_level_3 INTEGER DEFAULT 0,
  stripe_connect_account_id TEXT,
  stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
  stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
  stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_affiliates_parent_id ON public.affiliates(parent_id);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  click_id TEXT UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  conversion_id UUID NOT NULL REFERENCES public.affiliate_conversions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1,2,3)),
  commission_rate NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (affiliate_id, conversion_id, level)
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_conversion ON public.affiliate_commissions(conversion_id);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  period TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.alfie_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alfie_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.alfie_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.alfie_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alfie_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alfie_messages_conversation ON public.alfie_messages(conversation_id);

CREATE TABLE IF NOT EXISTS public.alfie_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt_type TEXT NOT NULL,
  response JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alfie_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alfie_cache_prompt_hash ON public.alfie_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_alfie_cache_type ON public.alfie_cache(prompt_type);

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  palette JSONB DEFAULT '[]'::JSONB,
  fonts JSONB DEFAULT '{}'::JSONB,
  logo_url TEXT,
  voice TEXT,
  plan brand_plan,
  is_addon BOOLEAN DEFAULT FALSE,
  canva_connected BOOLEAN DEFAULT FALSE,
  canva_team_id TEXT,
  canva_access_token TEXT,
  canva_refresh_token TEXT,
  images_used INTEGER DEFAULT 0,
  videos_used INTEGER DEFAULT 0,
  woofs_used INTEGER DEFAULT 0,
  quota_images INTEGER DEFAULT 0,
  quota_videos INTEGER DEFAULT 0,
  quota_woofs INTEGER DEFAULT 0,
  resets_on TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_brands_user ON public.brands(user_id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_brand_id_fkey
  FOREIGN KEY (active_brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  canva_template_id TEXT NOT NULL,
  ratios JSONB DEFAULT '[]'::JSONB,
  variables JSONB DEFAULT '[]'::JSONB,
  folder_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  brand_key TEXT,
  template_key TEXT,
  canva_design_id TEXT,
  title TEXT,
  planner_deep_link TEXT,
  suggested_slots JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress NUMERIC,
  max_retries INTEGER,
  retry_count INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}'::JSONB,
  output_data JSONB DEFAULT '{}'::JSONB,
  error TEXT,
  short_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.media_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('image','video','improved_image')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','processing','completed','failed')),
  engine video_engine,
  prompt TEXT,
  input_url TEXT,
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  job_id TEXT,
  is_source_upload BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,
  woofs INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_media_generations_user ON public.media_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_media_generations_job ON public.media_generations(job_id);

CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.canva_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  canva_url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.counters_monthly (
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  period_yyyymm INT NOT NULL,
  images_used INT DEFAULT 0,
  reels_used INT DEFAULT 0,
  woofs_used INT DEFAULT 0,
  PRIMARY KEY (brand_id, period_yyyymm)
);

ALTER TABLE public.counters_monthly ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INT NOT NULL,
  price_cents INT NOT NULL,
  discount_percentage INT,
  stripe_price_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INT NOT NULL,
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions(user_id);

CREATE TABLE IF NOT EXISTS public.deliverable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  canva_link TEXT,
  preview_url TEXT,
  zip_url TEXT,
  objective TEXT,
  style_choice TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deliverable ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  engine TEXT,
  prompt_summary TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  duration_seconds INTEGER,
  woofs_cost INT,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_generation_logs_user ON public.generation_logs(user_id);

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2),
  user_id UUID,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.usage_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.deliverable(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usage_event ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_video_id UUID REFERENCES public.media_generations(id) ON DELETE CASCADE,
  segment_index INT NOT NULL,
  segment_url TEXT NOT NULL,
  duration_seconds INT,
  is_temporary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_video_segments_parent ON public.video_segments(parent_video_id);

-- Seeds -------------------------------------------------------------------
INSERT INTO public.templates (key, canva_template_id, ratios, variables, folder_path)
VALUES
  ('hero_announcement', 'hero_template_1', '["1:1","16:9"]'::JSONB, '["Headline","Subtext","CTA","Logo"]'::JSONB, 'Alfie/Templates/Hero'),
  ('carousel_flow', 'carousel_template_1', '["4:5"]'::JSONB, '["Hook","Step1","Step2","Step3","Step4","Step5","CTA","Logo"]'::JSONB, 'Alfie/Templates/Carousel'),
  ('insight_proof', 'insight_template_1', '["1:1","4:5"]'::JSONB, '["Metric","Context","CTA","Logo"]'::JSONB, 'Alfie/Templates/Insight'),
  ('reel_video', 'reel_template_1', '["9:16"]'::JSONB, '["Hook","Steps","CTA","Logo"]'::JSONB, 'Alfie/Templates/Reel')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.credit_packs (name, credits, price_cents, discount_percentage, stripe_price_id)
VALUES
  ('Starter Boost', 50, 1900, NULL, 'price_starter_boost'),
  ('Pro Boost', 120, 3900, 10, 'price_pro_boost'),
  ('Studio Boost', 300, 8900, 15, 'price_studio_boost'),
  ('Enterprise Boost', 1000, 24900, 20, 'price_enterprise_boost')
ON CONFLICT (stripe_price_id) DO NOTHING;

-- Triggers ----------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_set_job_short_id ON public.jobs;
CREATE TRIGGER trigger_set_job_short_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_job_short_id();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_generations_updated_at ON public.media_generations;
CREATE TRIGGER update_media_generations_updated_at
  BEFORE UPDATE ON public.media_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliverable_updated_at ON public.deliverable;
CREATE TRIGGER update_deliverable_updated_at
  BEFORE UPDATE ON public.deliverable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_canva_designs_updated_at ON public.canva_designs;
CREATE TRIGGER update_canva_designs_updated_at
  BEFORE UPDATE ON public.canva_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_updated_at ON public.news;
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Row level security policies ---------------------------------------------
-- Profiles
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- User roles
CREATE POLICY IF NOT EXISTS "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Admins can view all roles"
  ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Affiliates
CREATE POLICY IF NOT EXISTS "Authenticated affiliates can view own data"
  ON public.affiliates FOR SELECT USING (email = (auth.jwt()->>'email'));
CREATE POLICY IF NOT EXISTS "Admins can view all affiliates"
  ON public.affiliates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Authenticated affiliates can view own clicks"
  ON public.affiliate_clicks FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email'))
  );
CREATE POLICY IF NOT EXISTS "Admins can view all clicks"
  ON public.affiliate_clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Authenticated affiliates can view own conversions"
  ON public.affiliate_conversions FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email'))
  );
CREATE POLICY IF NOT EXISTS "Admins can view all conversions"
  ON public.affiliate_conversions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Authenticated affiliates can view own commissions"
  ON public.affiliate_commissions FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email'))
  );
CREATE POLICY IF NOT EXISTS "Admins can view all commissions"
  ON public.affiliate_commissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Authenticated affiliates can view own payouts"
  ON public.affiliate_payouts FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email'))
  );
CREATE POLICY IF NOT EXISTS "Admins can view all payouts"
  ON public.affiliate_payouts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Alfie conversations/messages
CREATE POLICY IF NOT EXISTS "Users can view their own conversations"
  ON public.alfie_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can create their own conversations"
  ON public.alfie_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own conversations"
  ON public.alfie_conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can delete their own conversations"
  ON public.alfie_conversations FOR DELETE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can view messages from their conversations"
  ON public.alfie_messages FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.alfie_conversations WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users can create messages in their conversations"
  ON public.alfie_messages FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM public.alfie_conversations WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users can delete messages from their conversations"
  ON public.alfie_messages FOR DELETE USING (
    conversation_id IN (SELECT id FROM public.alfie_conversations WHERE user_id = auth.uid())
  );

-- Alfie cache
CREATE POLICY IF NOT EXISTS "Anyone can read cache"
  ON public.alfie_cache FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "Service role can write cache"
  ON public.alfie_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Brands & posts
CREATE POLICY IF NOT EXISTS "Users can view their own brands"
  ON public.brands FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can insert their own brands"
  ON public.brands FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own brands"
  ON public.brands FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can delete their own brands"
  ON public.brands FOR DELETE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can view their own posts"
  ON public.posts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can insert their own posts"
  ON public.posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own posts"
  ON public.posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can delete their own posts"
  ON public.posts FOR DELETE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Templates are viewable by everyone"
  ON public.templates FOR SELECT USING (TRUE);

-- Jobs
CREATE POLICY IF NOT EXISTS "Users can view their own jobs"
  ON public.jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can insert their own jobs"
  ON public.jobs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Media generations
CREATE POLICY IF NOT EXISTS "Users can view their own media generations"
  ON public.media_generations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can create their own media generations"
  ON public.media_generations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own media generations"
  ON public.media_generations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can delete their own media generations"
  ON public.media_generations FOR DELETE USING (user_id = auth.uid());

-- Video segments
CREATE POLICY IF NOT EXISTS "Users can view segments of their videos"
  ON public.video_segments FOR SELECT USING (
    parent_video_id IN (
      SELECT id FROM public.media_generations WHERE user_id = auth.uid()
    )
  );

-- News
CREATE POLICY IF NOT EXISTS "Anyone can view published news"
  ON public.news FOR SELECT USING (published = TRUE);
CREATE POLICY IF NOT EXISTS "Admins can view all news"
  ON public.news FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can create news"
  ON public.news FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can update news"
  ON public.news FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can delete news"
  ON public.news FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Canva designs
CREATE POLICY IF NOT EXISTS "Anyone can view canva designs"
  ON public.canva_designs FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert canva designs"
  ON public.canva_designs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Contact requests
CREATE POLICY IF NOT EXISTS "Anyone can submit contact requests"
  ON public.contact_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY IF NOT EXISTS "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Counters / deliverables / usage events
CREATE POLICY IF NOT EXISTS "Users can view own brand counters"
  ON public.counters_monthly FOR SELECT USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Service can manage counters"
  ON public.counters_monthly FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Users can view own deliverables"
  ON public.deliverable FOR SELECT USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users can insert own deliverables"
  ON public.deliverable FOR INSERT WITH CHECK (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users can update own deliverables"
  ON public.deliverable FOR UPDATE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users can delete own deliverables"
  ON public.deliverable FOR DELETE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can view own usage events"
  ON public.usage_event FOR SELECT USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Service can insert usage events"
  ON public.usage_event FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Credit packs & transactions
CREATE POLICY IF NOT EXISTS "Anyone can view credit packs"
  ON public.credit_packs FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "Users can view own transactions"
  ON public.credit_transactions FOR SELECT USING (
    user_id = auth.uid()
  );
CREATE POLICY IF NOT EXISTS "Service role can insert generation logs"
  ON public.generation_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Users can view own generation logs"
  ON public.generation_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Admins can view all generation logs"
  ON public.generation_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Payment sessions
CREATE POLICY IF NOT EXISTS "Users can view their own payment sessions"
  ON public.payment_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Service role can manage payment sessions"
  ON public.payment_sessions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Video segments
CREATE POLICY IF NOT EXISTS "Users can create their own video segments"
  ON public.video_segments FOR INSERT WITH CHECK (
    parent_video_id IN (SELECT id FROM public.media_generations WHERE user_id = auth.uid())
  );

-- Storage policies for generated assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Users can upload generated assets"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "Users can manage their generated assets"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "Users can view their generated assets"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "Public assets are viewable"
  ON storage.objects FOR SELECT USING (bucket_id = 'assets');

COMMIT;
