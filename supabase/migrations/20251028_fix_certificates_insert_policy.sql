-- 20251028_fix_certificates_insert_policy.sql
-- Fix: Add missing INSERT policy for certificates table

BEGIN;

      -- Drop existing policies to avoid conflicts
      DROP POLICY
      IF EXISTS "Certificates are publicly viewable" ON public.certificates;
      DROP POLICY
      IF EXISTS "Users can view their own certificates" ON public.certificates;

      -- Create comprehensive policies for certificates table
      CREATE POLICY "Enable read access for all users" ON public.certificates
  FOR
      SELECT USING (true);

      CREATE POLICY "Enable insert for authenticated users" ON public.certificates
  FOR
      INSERT WITH CHECK (auth.uid() =
      user_id);

      CREATE POLICY "Enable update for users based on user_id" ON public.certificates
  FOR
      UPDATE USING (auth.uid()
      = user_id);

      CREATE POLICY "Enable all for admins" ON public.certificates
  FOR ALL USING
      (
    EXISTS
      (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
      );

      COMMIT;