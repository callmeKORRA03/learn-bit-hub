-- 20251026_add_certificates_rls_and_columns.sql
-- Master migration: add missing certificate columns (idempotent) and create safe RLS policies.
-- Designed to be safe to run multiple times.

BEGIN;

      -- 1) Add missing columns used by the app (if they do not exist)
      ALTER TABLE
      IF EXISTS public.certificates
      ADD COLUMN
      IF NOT EXISTS status text DEFAULT 'pending',
      ADD COLUMN
      IF NOT EXISTS requested_at timestamptz DEFAULT now
      (),
      ADD COLUMN
      IF NOT EXISTS approved_by uuid REFERENCES auth.users
      (id),
      ADD COLUMN
      IF NOT EXISTS pdf_url text,
      ADD COLUMN
      IF NOT EXISTS signature text,
      ADD COLUMN
      IF NOT EXISTS signer_metadata jsonb,
      ADD COLUMN
      IF NOT EXISTS approved_at timestamptz;

-- 2) Ensure a named unique constraint for (user_id, course_id) exists (ignore if already present)
DO $$
BEGIN
      IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
      WHERE conname = 'certificates_user_course_unique'
  ) THEN
      BEGIN
            ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_user_course_unique UNIQUE (user_id, course_id);
            EXCEPTION WHEN duplicate_object THEN
      -- if it already exists under a different name, ignore
      NULL;
END;
END
IF;
END;
$$;

-- 3) Ensure status check constraint exists
DO $$
BEGIN
      IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
      WHERE conname = 'certificates_status_check'
  ) THEN
      ALTER TABLE public.certificates
    ADD CONSTRAINT certificates_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
END
IF;
END;
$$;

-- 4) Enable RLS (idempotent)
ALTER TABLE
IF EXISTS public.certificates ENABLE ROW LEVEL SECURITY;

-- 5) Remove any old conflicting policies with same names (safe)
DROP POLICY
IF EXISTS "Certificates: insert own" ON public.certificates;
DROP POLICY
IF EXISTS "Certificates: select own" ON public.certificates;
DROP POLICY
IF EXISTS "Certificates: update own" ON public.certificates;
DROP POLICY
IF EXISTS "Certificates: admin access" ON public.certificates;
DROP POLICY
IF EXISTS "Certificates are publicly viewable" ON public.certificates;

-- 6) PUBLIC SELECT policy (optional but kept for backwards compatibility)
CREATE POLICY
IF NOT EXISTS "Certificates are publicly viewable" ON public.certificates
  FOR
SELECT
      TO public
  USING
(true);

-- 7) Allow authenticated users to SELECT their own certificates
CREATE POLICY
IF NOT EXISTS "Certificates: select own" ON public.certificates
  FOR
SELECT
      TO authenticated
USING
(user_id = auth.uid
());

-- 8) Allow authenticated users to INSERT certificate requests ONLY for themselves
CREATE POLICY
IF NOT EXISTS "Certificates: insert own" ON public.certificates
  FOR
INSERT
  TO authenticated
  WITH CHECK (
user_id
=
auth
.uid
());

-- 9) Allow authenticated users to UPDATE their own certificate rows
CREATE POLICY
IF NOT EXISTS "Certificates: update own" ON public.certificates
  FOR
UPDATE
  TO authenticated
  USING (user_id = auth.uid())
WITH CHECK
(user_id = auth.uid
());

-- 10) Admin policy: allow admin users (via public.user_roles) to do all operations
-- This assumes your migrations already create public.user_roles and a has_role() function.
CREATE POLICY
IF NOT EXISTS "Certificates: admin access" ON public.certificates
  FOR ALL
  TO authenticated
  USING
(
    EXISTS
(
      SELECT 1
FROM public.user_roles ur
WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
)
  WITH CHECK
(
    EXISTS
(
      SELECT 1
FROM public.user_roles ur
WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- 11) Helpful indexes
CREATE INDEX
IF NOT EXISTS idx_certificates_user_id ON public.certificates
(user_id);
CREATE INDEX
IF NOT EXISTS idx_certificates_status ON public.certificates
(status);

COMMIT;
