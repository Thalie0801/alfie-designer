-- Table pour les actualités
CREATE TABLE IF NOT EXISTS public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Policies pour news
CREATE POLICY "Anyone can view published news"
  ON public.news
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can view all news"
  ON public.news
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create news"
  ON public.news
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news"
  ON public.news
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete news"
  ON public.news
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Index pour améliorer les performances
CREATE INDEX idx_news_published ON public.news(published);
CREATE INDEX idx_news_created_at ON public.news(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();