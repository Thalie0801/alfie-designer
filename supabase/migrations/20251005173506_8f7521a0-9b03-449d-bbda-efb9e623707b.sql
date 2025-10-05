-- Fix Critical Security Issue: Affiliate Email Exposure
-- Drop the insecure policy that allows email enumeration
DROP POLICY IF EXISTS "Affiliates can view their own data" ON public.affiliates;

-- Create secure policy: Only authenticated users can view their own record by ID
CREATE POLICY "Authenticated affiliates can view own data"
ON public.affiliates
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Add admin policy for admin panel functionality
CREATE POLICY "Admins can view all affiliates"
ON public.affiliates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Apply same security fix to related tables
-- Fix affiliate_conversions
DROP POLICY IF EXISTS "Affiliates can view their own conversions" ON public.affiliate_conversions;

CREATE POLICY "Authenticated affiliates can view own conversions"
ON public.affiliate_conversions
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Admins can view all conversions"
ON public.affiliate_conversions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix affiliate_commissions
DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON public.affiliate_commissions;

CREATE POLICY "Authenticated affiliates can view own commissions"
ON public.affiliate_commissions
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Admins can view all commissions"
ON public.affiliate_commissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix affiliate_clicks
DROP POLICY IF EXISTS "Affiliates can view their own clicks" ON public.affiliate_clicks;

CREATE POLICY "Authenticated affiliates can view own clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Admins can view all clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix affiliate_payouts
DROP POLICY IF EXISTS "Affiliates can view their own payouts" ON public.affiliate_payouts;

CREATE POLICY "Authenticated affiliates can view own payouts"
ON public.affiliate_payouts
FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid());

CREATE POLICY "Admins can view all payouts"
ON public.affiliate_payouts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));