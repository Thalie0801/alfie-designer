-- Supabase schema for Alfie Designer when using a self-hosted Supabase instance
-- Generated to mirror the tables used by the Lovable Cloud project.

BEGIN;

-- Required extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function reused by multiple triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Role & plan enumerations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'affiliate');
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

-- Profiles & auth helpers ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  plan TEXT DEFAULT NULL,
  quota_visuals_per_month INTEGER DEFAULT 0,
  quota_brands INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  ai_credits_monthly INTEGER DEFAULT 0,
  ai_credits_purchased INTEGER DEFAULT 0,
  ai_credits_from_affiliation INTEGER DEFAULT 0,
  credits_reset_date TIMESTAMPTZ DEFAULT now(),
  generations_this_month INTEGER DEFAULT 0,
  generations_reset_date TIMESTAMPTZ DEFAULT date_trunc('month', now() + interval '1 month'),
  alfie_requests_this_month INTEGER DEFAULT 0,
  alfie_requests_reset_date TIMESTAMPTZ DEFAULT date_trunc('month', now() + interval '1 month'),
  quota_videos INTEGER DEFAULT 0,
  videos_this_month INTEGER DEFAULT 0,
  woofs_consumed_this_month INTEGER DEFAULT 0
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
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

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

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
  FROM public.profiles
  WHERE id = user_id_param;

  IF reset_date < now() THEN
    UPDATE public.profiles
    SET
      alfie_requests_this_month = 1,
      alfie_requests_reset_date = date_trunc('month', now() + interval '1 month')
    WHERE id = user_id_param;
    RETURN 1;
  END IF;

  UPDATE public.profiles
  SET alfie_requests_this_month = COALESCE(alfie_requests_this_month, 0) + 1
  WHERE id = user_id_param;

  RETURN COALESCE(current_count, 0) + 1;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Brands --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  palette JSONB DEFAULT '[]'::jsonb,
  fonts JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  voice TEXT,
  canva_connected BOOLEAN DEFAULT false,
  canva_team_id TEXT,
  canva_access_token TEXT,
  canva_refresh_token TEXT,
  plan public.plan_type DEFAULT NULL,
  quota_images INTEGER DEFAULT 0,
  quota_videos INTEGER DEFAULT 0,
  quota_woofs INTEGER DEFAULT 0,
  images_used INTEGER DEFAULT 0,
  videos_used INTEGER DEFAULT 0,
  woofs_used INTEGER DEFAULT 0,
  resets_on DATE DEFAULT (date_trunc('month', now() + interval '1 month'))::date,
  stripe_subscription_id TEXT,
  is_addon BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_user_id ON public.brands(user_id);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
CREATE POLICY "Users can view their own brands"
  ON public.brands FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
CREATE POLICY "Users can insert their own brands"
  ON public.brands FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands"
  ON public.brands FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands"
  ON public.brands FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Attach active brand pointer now that brands exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_active_brand ON public.profiles(active_brand_id);

-- Templates -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  canva_template_id TEXT NOT NULL,
  ratios JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  folder_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON public.templates;
CREATE POLICY "Templates are viewable by everyone"
  ON public.templates FOR SELECT
  USING (true);

-- Posts ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  brand_key TEXT,
  template_key TEXT,
  canva_design_id TEXT,
  title TEXT,
  planner_deep_link TEXT,
  suggested_slots JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (user_id = auth.uid());

-- Jobs ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 1,
  short_id TEXT
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
CREATE POLICY "Users can view their own jobs"
  ON public.jobs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.jobs;
CREATE POLICY "Users can insert their own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_short_job_id()
RETURNS TEXT
LANGUAGE plpgsql
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
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := public.generate_short_job_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_job_short_id ON public.jobs;
CREATE TRIGGER trigger_set_job_short_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_job_short_id();

-- Affiliates ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  payout_method TEXT,
  status TEXT DEFAULT 'active',
  parent_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  affiliate_status TEXT DEFAULT 'creator' CHECK (affiliate_status IN ('creator','mentor','leader')),
  active_direct_referrals INTEGER DEFAULT 0,
  total_referrals_level_2 INTEGER DEFAULT 0,
  total_referrals_level_3 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_parent_id ON public.affiliates(parent_id);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliates can view their own data" ON public.affiliates;
CREATE POLICY "Affiliates can view their own data"
  ON public.affiliates FOR SELECT
  USING (email = (auth.jwt()->>'email'));

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  click_id TEXT UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliates can view their own clicks" ON public.affiliate_clicks;
CREATE POLICY "Affiliates can view their own clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email')
  ));

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliates can view their own conversions" ON public.affiliate_conversions;
CREATE POLICY "Affiliates can view their own conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email')
  ));

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  period TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliates can view their own payouts" ON public.affiliate_payouts;
CREATE POLICY "Affiliates can view their own payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email')
  ));

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  conversion_id UUID NOT NULL REFERENCES public.affiliate_conversions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1,2,3)),
  commission_rate NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (affiliate_id, conversion_id, level)
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_conversion ON public.affiliate_commissions(conversion_id);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON public.affiliate_commissions;
CREATE POLICY "Affiliates can view their own commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email')
  ));

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
    SELECT * INTO affiliate_record FROM public.affiliates WHERE id = current_affiliate_id;
    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF current_level = 1 THEN
      IF affiliate_record.status = 'active' THEN
        commission_rate := 0.15;
      ELSE
        commission_rate := 0;
      END IF;
    ELSIF current_level = 2 THEN
      IF affiliate_record.affiliate_status IN ('mentor','leader') AND affiliate_record.active_direct_referrals >= 3 THEN
        commission_rate := 0.05;
      ELSE
        commission_rate := 0;
      END IF;
    ELSE
      IF affiliate_record.affiliate_status = 'leader' AND affiliate_record.active_direct_referrals >= 5 THEN
        commission_rate := 0.02;
      ELSE
        commission_rate := 0;
      END IF;
    END IF;

    IF commission_rate > 0 THEN
      commission_amount := conversion_amount * commission_rate;
      INSERT INTO public.affiliate_commissions (affiliate_id, conversion_id, level, commission_rate, amount)
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
  SELECT COUNT(DISTINCT a.id) INTO direct_referrals
  FROM public.affiliates a
  JOIN public.affiliate_conversions ac ON ac.affiliate_id = a.id
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

  UPDATE public.affiliates
  SET
    affiliate_status = new_status,
    active_direct_referrals = direct_referrals
  WHERE id = affiliate_id_param;
END;
$$;

-- RLS for auth storage bucket entries used by media generations lives in storage policies.

-- Alfie cache ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alfie_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt_type TEXT NOT NULL,
  response JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alfie_cache_prompt_hash ON public.alfie_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_alfie_cache_type ON public.alfie_cache(prompt_type);

ALTER TABLE public.alfie_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read cache" ON public.alfie_cache;
CREATE POLICY "Anyone can read cache"
  ON public.alfie_cache FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Service role can write cache" ON public.alfie_cache;
CREATE POLICY "Service role can write cache"
  ON public.alfie_cache FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Conversations & messages ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alfie_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alfie_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.alfie_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alfie_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alfie_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.alfie_conversations;
CREATE POLICY "Users can view their own conversations"
  ON public.alfie_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.alfie_conversations;
CREATE POLICY "Users can create their own conversations"
  ON public.alfie_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.alfie_conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.alfie_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.alfie_conversations;
CREATE POLICY "Users can delete their own conversations"
  ON public.alfie_conversations FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.alfie_messages;
CREATE POLICY "Users can view messages from their conversations"
  ON public.alfie_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.alfie_conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.alfie_messages;
CREATE POLICY "Users can create messages in their conversations"
  ON public.alfie_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.alfie_conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON public.alfie_messages;
CREATE POLICY "Users can delete messages from their conversations"
  ON public.alfie_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.alfie_conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_alfie_conversations_user_id ON public.alfie_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_alfie_messages_conversation_id ON public.alfie_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_alfie_messages_created_at ON public.alfie_messages(created_at);

CREATE TRIGGER update_alfie_conversations_updated_at
  BEFORE UPDATE ON public.alfie_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Canva designs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canva_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  canva_url TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view canva designs" ON public.canva_designs;
CREATE POLICY "Anyone can view canva designs"
  ON public.canva_designs FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert canva designs" ON public.canva_designs;
CREATE POLICY "Authenticated users can insert canva designs"
  ON public.canva_designs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_canva_designs_category ON public.canva_designs(category);
CREATE INDEX IF NOT EXISTS idx_canva_designs_created_at ON public.canva_designs(created_at DESC);

CREATE TRIGGER update_canva_designs_updated_at
  BEFORE UPDATE ON public.canva_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Contact requests -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit contact requests" ON public.contact_requests;
CREATE POLICY "Anyone can submit contact requests"
  ON public.contact_requests FOR INSERT
  TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at DESC);

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Counters, deliverables & usage events -------------------------------------
CREATE TABLE IF NOT EXISTS public.counters_monthly (
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  period_yyyymm INT NOT NULL,
  images_used INT NOT NULL DEFAULT 0,
  reels_used INT NOT NULL DEFAULT 0,
  woofs_used INT NOT NULL DEFAULT 0,
  PRIMARY KEY (brand_id, period_yyyymm)
);

CREATE TABLE IF NOT EXISTS public.deliverable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('image','carousel','reel')),
  objective TEXT,
  style_choice TEXT CHECK (style_choice IN ('template_canva','ia')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preview','processing','completed','failed')),
  preview_url TEXT,
  canva_link TEXT,
  zip_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.deliverable(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image_ai','carousel_ai_image','reel_export','premium_t2v')),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counters_monthly_brand ON public.counters_monthly(brand_id, period_yyyymm DESC);
CREATE INDEX IF NOT EXISTS idx_deliverable_brand_status ON public.deliverable(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverable_updated ON public.deliverable(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_event_brand ON public.usage_event(brand_id, created_at DESC);

ALTER TABLE public.counters_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brand counters" ON public.counters_monthly;
CREATE POLICY "Users can view own brand counters"
  ON public.counters_monthly FOR SELECT
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Service can manage counters" ON public.counters_monthly;
CREATE POLICY "Service can manage counters"
  ON public.counters_monthly FOR ALL
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own deliverables" ON public.deliverable;
CREATE POLICY "Users can view own deliverables"
  ON public.deliverable FOR SELECT
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own deliverables" ON public.deliverable;
CREATE POLICY "Users can insert own deliverables"
  ON public.deliverable FOR INSERT
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own deliverables" ON public.deliverable;
CREATE POLICY "Users can update own deliverables"
  ON public.deliverable FOR UPDATE
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own deliverables" ON public.deliverable;
CREATE POLICY "Users can delete own deliverables"
  ON public.deliverable FOR DELETE
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own usage events" ON public.usage_event;
CREATE POLICY "Users can view own usage events"
  ON public.usage_event FOR SELECT
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Service can insert usage events" ON public.usage_event;
CREATE POLICY "Service can insert usage events"
  ON public.usage_event FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.increment_monthly_counters(
  p_brand_id UUID,
  p_period_yyyymm INT,
  p_images INT DEFAULT 0,
  p_reels INT DEFAULT 0,
  p_woofs INT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.counters_monthly (brand_id, period_yyyymm, images_used, reels_used, woofs_used)
  VALUES (p_brand_id, p_period_yyyymm, p_images, p_reels, p_woofs)
  ON CONFLICT (brand_id, period_yyyymm)
  DO UPDATE SET
    images_used = public.counters_monthly.images_used + EXCLUDED.images_used,
    reels_used = public.counters_monthly.reels_used + EXCLUDED.reels_used,
    woofs_used = public.counters_monthly.woofs_used + EXCLUDED.woofs_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_deliverable_updated_at
  BEFORE UPDATE ON public.deliverable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Credit packs & transactions -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view credit packs" ON public.credit_packs;
CREATE POLICY "Anyone can view credit packs"
  ON public.credit_packs FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('monthly_reset','purchase','affiliation_conversion','usage')),
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Generation logs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  engine TEXT CHECK (engine IN ('nano','sora','veo3')),
  prompt_summary TEXT,
  woofs_cost INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success','failed','expired')),
  duration_seconds INTEGER,
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_brand_created ON public.generation_logs(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_created ON public.generation_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_logs_type_engine ON public.generation_logs(type, engine) WHERE status = 'success';

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own generation logs" ON public.generation_logs;
CREATE POLICY "Users can view own generation logs"
  ON public.generation_logs FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all generation logs" ON public.generation_logs;
CREATE POLICY "Admins can view all generation logs"
  ON public.generation_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role can insert generation logs" ON public.generation_logs;
CREATE POLICY "Service role can insert generation logs"
  ON public.generation_logs FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.purge_old_generation_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.generation_logs
  WHERE created_at < (now() - interval '30 days');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purge_old_logs_trigger ON public.generation_logs;
CREATE TRIGGER purge_old_logs_trigger
  AFTER INSERT ON public.generation_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.purge_old_generation_logs();

-- Media generations & video segments ----------------------------------------
CREATE TABLE IF NOT EXISTS public.media_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image','video','improved_image')),
  prompt TEXT,
  input_url TEXT,
  output_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','processing','completed','failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  engine public.video_engine,
  woofs INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  is_source_upload BOOLEAN DEFAULT FALSE,
  job_id UUID REFERENCES public.jobs(id)
);

ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own media generations" ON public.media_generations;
CREATE POLICY "Users can view their own media generations"
  ON public.media_generations FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create their own media generations" ON public.media_generations;
CREATE POLICY "Users can create their own media generations"
  ON public.media_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own media generations" ON public.media_generations;
CREATE POLICY "Users can update their own media generations"
  ON public.media_generations FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own media generations" ON public.media_generations;
CREATE POLICY "Users can delete their own media generations"
  ON public.media_generations FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_media_generations_user_type_created
  ON public.media_generations(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_generations_brand ON public.media_generations(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_generations_engine ON public.media_generations(engine);
CREATE INDEX IF NOT EXISTS idx_media_generations_expires_at ON public.media_generations(expires_at);

CREATE TRIGGER update_media_generations_updated_at
  BEFORE UPDATE ON public.media_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_video_id UUID REFERENCES public.media_generations(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  segment_url TEXT NOT NULL,
  duration_seconds INTEGER,
  is_temporary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view segments of their videos" ON public.video_segments;
CREATE POLICY "Users can view segments of their videos"
  ON public.video_segments FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.media_generations
    WHERE public.media_generations.id = public.video_segments.parent_video_id
      AND public.media_generations.user_id = auth.uid()
  ));

-- News ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news;
CREATE POLICY "Anyone can view published news"
  ON public.news FOR SELECT
  USING (published = true);
DROP POLICY IF EXISTS "Admins can view all news" ON public.news;
CREATE POLICY "Admins can view all news"
  ON public.news FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can create news" ON public.news;
CREATE POLICY "Admins can create news"
  ON public.news FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update news" ON public.news;
CREATE POLICY "Admins can update news"
  ON public.news FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete news" ON public.news;
CREATE POLICY "Admins can delete news"
  ON public.news FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(published);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at DESC);

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Payment sessions -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_session ON public.payment_sessions(session_id);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payment sessions" ON public.payment_sessions;
CREATE POLICY "Admins can view payment sessions"
  ON public.payment_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role can insert payment sessions" ON public.payment_sessions;
CREATE POLICY "Service role can insert payment sessions"
  ON public.payment_sessions FOR INSERT
  WITH CHECK (true);

COMMIT;
