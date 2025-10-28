-- 20251028120000_final_certificates_fix.sql
-- FINAL FIX: Add missing INSERT policy for certificates

-- First, remove any existing policies to avoid conflicts
DROP POLICY
IF EXISTS "Certificates are publicly viewable" ON public.certificates;
DROP POLICY
IF EXISTS "Users can view their own certificates" ON public.certificates;

-- Create the essential policies
CREATE POLICY "certificates_select_policy" ON public.certificates
FOR
SELECT USING (true);

CREATE POLICY "certificates_insert_policy" ON public.certificates
FOR
INSERT WITH CHECK (auth.uid() =
user_id);

CREATE POLICY "certificates_update_policy" ON public.certificates
FOR
UPDATE USING (auth.uid()
= user_id);

CREATE POLICY "certificates_admin_policy" ON public.certificates
FOR ALL USING
(public.has_role
(auth.uid
(), 'admin'));