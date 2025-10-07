-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-generations', 'media-generations', true);

-- Create table to track media generations
CREATE TABLE IF NOT EXISTS public.media_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video', 'improved_image')),
  prompt text,
  input_url text,
  output_url text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own media generations"
  ON public.media_generations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own media generations"
  ON public.media_generations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own media generations"
  ON public.media_generations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own media generations"
  ON public.media_generations
  FOR DELETE
  USING (user_id = auth.uid());

-- Storage policies for media-generations bucket
CREATE POLICY "Users can upload their own media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-generations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own media"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'media-generations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view public media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media-generations');

CREATE POLICY "Users can delete their own media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media-generations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_media_generations_updated_at
  BEFORE UPDATE ON public.media_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();