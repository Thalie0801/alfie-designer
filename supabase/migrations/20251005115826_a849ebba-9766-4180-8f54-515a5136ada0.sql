-- Create brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  palette JSONB DEFAULT '[]'::jsonb,
  fonts JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  voice TEXT,
  canva_connected BOOLEAN DEFAULT false,
  canva_team_id TEXT,
  canva_access_token TEXT,
  canva_refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  canva_template_id TEXT NOT NULL,
  ratios JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  folder_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create affiliates table
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  payout_method TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create affiliate_clicks table
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  click_id TEXT UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create affiliate_conversions table
CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create affiliate_payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  period TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brands
CREATE POLICY "Users can view their own brands"
  ON public.brands FOR SELECT
  USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert their own brands"
  ON public.brands FOR INSERT
  WITH CHECK (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can update their own brands"
  ON public.brands FOR UPDATE
  USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete their own brands"
  ON public.brands FOR DELETE
  USING (user_id::text = (SELECT auth.uid()::text));

-- Create RLS policies for posts
CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (user_id::text = (SELECT auth.uid()::text));

-- Create RLS policies for jobs
CREATE POLICY "Users can view their own jobs"
  ON public.jobs FOR SELECT
  USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert their own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (user_id::text = (SELECT auth.uid()::text));

-- Create RLS policies for templates (public read)
CREATE POLICY "Templates are viewable by everyone"
  ON public.templates FOR SELECT
  USING (true);

-- Create RLS policies for affiliates (only affiliates can view their own data)
CREATE POLICY "Affiliates can view their own data"
  ON public.affiliates FOR SELECT
  USING (email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Affiliates can view their own clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (SELECT auth.jwt()->>'email')));

CREATE POLICY "Affiliates can view their own conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (SELECT auth.jwt()->>'email')));

CREATE POLICY "Affiliates can view their own payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE email = (SELECT auth.jwt()->>'email')));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on brands
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.templates (key, canva_template_id, ratios, variables, folder_path) VALUES
  ('hero_announcement', 'hero_template_1', '["1:1", "16:9"]'::jsonb, '["Headline", "Subtext", "CTA", "Logo"]'::jsonb, 'Alfie/Templates/Hero'),
  ('carousel_flow', 'carousel_template_1', '["4:5"]'::jsonb, '["Hook", "Step1", "Step2", "Step3", "Step4", "Step5", "CTA", "Logo"]'::jsonb, 'Alfie/Templates/Carousel'),
  ('insight_proof', 'insight_template_1', '["1:1", "4:5"]'::jsonb, '["Metric", "Context", "CTA", "Logo"]'::jsonb, 'Alfie/Templates/Insight'),
  ('reel_video', 'reel_template_1', '["9:16"]'::jsonb, '["Hook", "Steps", "CTA", "Logo"]'::jsonb, 'Alfie/Templates/Reel');