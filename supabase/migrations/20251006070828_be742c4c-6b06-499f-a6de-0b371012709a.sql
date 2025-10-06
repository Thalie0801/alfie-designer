-- Create table for Canva designs catalog
CREATE TABLE public.canva_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  canva_url TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view the catalog)
CREATE POLICY "Anyone can view canva designs"
ON public.canva_designs
FOR SELECT
USING (true);

-- Only authenticated users can insert designs
CREATE POLICY "Authenticated users can insert canva designs"
ON public.canva_designs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_canva_designs_category ON public.canva_designs(category);
CREATE INDEX idx_canva_designs_created_at ON public.canva_designs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_canva_designs_updated_at
BEFORE UPDATE ON public.canva_designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();