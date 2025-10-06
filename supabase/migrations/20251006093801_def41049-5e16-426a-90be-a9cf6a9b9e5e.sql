-- Create table for enterprise contact requests
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contact requests
CREATE POLICY "Anyone can submit contact requests"
ON public.contact_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view contact requests
CREATE POLICY "Admins can view all contact requests"
ON public.contact_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_contact_requests_updated_at
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for email lookups
CREATE INDEX idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX idx_contact_requests_created_at ON public.contact_requests(created_at DESC);