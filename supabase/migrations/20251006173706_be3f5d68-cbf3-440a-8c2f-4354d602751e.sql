-- Drop the existing SELECT policy that doesn't use the security definer function
DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;

-- Create a new SELECT policy using the has_role security definer function
CREATE POLICY "Admins can view all contact requests" 
ON public.contact_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));