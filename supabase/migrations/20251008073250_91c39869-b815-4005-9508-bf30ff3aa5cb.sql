-- Add image_url and video_url columns to alfie_messages table
ALTER TABLE public.alfie_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;