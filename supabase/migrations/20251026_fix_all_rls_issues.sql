-- 20251026_fix_all_rls_issues.sql
-- Comprehensive fix for RLS policies and user creation

BEGIN;

      -- Fix for certificates RLS policies
      DROP POLICY
      IF EXISTS "Certificates are publicly viewable" ON public.certificates;
      DROP POLICY
      IF EXISTS "Users can view their own certificates" ON public.certificates;

      -- Create proper certificates policies
      CREATE POLICY "Enable read access for all users" ON public.certificates
  FOR
      SELECT USING (true);

      CREATE POLICY "Enable insert for authenticated users only" ON public.certificates
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

      -- Fix user creation trigger and RLS
      DROP POLICY
      IF EXISTS "Users are viewable by everyone" ON public.users;
      DROP POLICY
      IF EXISTS "Users can update own profile" ON public.users;

      -- Recreate user policies
      CREATE POLICY "Enable read access for all users" ON public.users
  FOR
      SELECT USING (true);

      CREATE POLICY "Enable insert for authenticated users only" ON public.users
  FOR
      INSERT WITH CHECK (auth.uid() =
      id);

      CREATE POLICY "Enable update for users based on id" ON public.users
  FOR
      UPDATE USING (auth.uid()
      = id);

      -- Fix the handle_new_user function to work with RLS
      CREATE OR REPLACE FUNCTION public.handle_new_user
      ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
      SET search_path
      = public
AS $$
      BEGIN
            -- Insert into users table - this will now work with RLS because it's security definer
            INSERT INTO public.users
                  (id, wallet_address, username, xp, bitcred_balance, role)
            VALUES
                  (
                        NEW.id,
                        NEW.raw_user_meta_data->>'wallet_address',
                        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
                        0,
                        10,
                        'user'
  );

            -- Check if this is the admin wallet and assign admin role
            IF (NEW.raw_user_meta_data->>'wallet_address' = '0xCf23C57FDbFFe8aa8E35612a15F0EC041f3B02f6' OR NEW.email = 'admin@bitedu.dev') THEN
            INSERT INTO public.user_roles
                  (user_id, role)
            VALUES
                  (NEW.id, 'admin')
            ON CONFLICT
            (user_id, role) DO NOTHING;
      ELSE
      -- Assign default user role
      INSERT INTO public.user_roles
            (user_id, role)
      VALUES
            (NEW.id, 'user')
      ON CONFLICT
      (user_id, role) DO NOTHING;
END
IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER
INSERT ON
auth.users
FOR EACH ROW
EXECUTE
FUNCTION public.handle_new_user
();

-- Fix user_roles RLS policies
DROP POLICY
IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Enable read access for all users" ON public.user_roles
  FOR
SELECT USING (true);

CREATE POLICY "Enable all for admins" ON public.user_roles
  FOR ALL USING
(
    EXISTS
(
      SELECT 1
FROM public.user_roles ur
WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Add any missing columns that might cause issues
ALTER TABLE public.certificates 
  ADD COLUMN
IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN
IF NOT EXISTS requested_at timestamptz DEFAULT now
(),
ADD COLUMN
IF NOT EXISTS approved_by uuid REFERENCES auth.users
(id);

-- Ensure constraint exists
DO $$ 
BEGIN
      IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
      WHERE conname = 'certificates_status_check'
  ) THEN
      ALTER TABLE public.certificates
    ADD CONSTRAINT certificates_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
END
IF;
END $$;

COMMIT;