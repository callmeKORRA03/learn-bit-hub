-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table with proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create nonces table for wallet authentication
CREATE TABLE IF NOT EXISTS public.nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nonces_wallet ON public.nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nonces_expires ON public.nonces(expires_at);

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON public.chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id);

-- RLS Policies for user_roles (read-only for all authenticated users)
CREATE POLICY "Users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Admin policies for courses, chapters, lessons (admins can manage all)
CREATE POLICY "Admins can manage courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage chapters"
ON public.chapters
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update users table RLS to allow self-update
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Insert admin role for specified wallet address
-- First, we need to ensure the user exists or will exist when they sign in
-- We'll create a trigger to auto-assign the admin role when this specific user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, wallet_address, username, xp, bitcred_balance, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'wallet_address',
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    0,
    10,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check if this is the admin wallet and assign admin role
  IF (NEW.raw_user_meta_data->>'wallet_address' = '0xCf23C57FDbFFe8aa8E35612a15F0EC041f3B02f6' OR NEW.email = 'admin@bitedu.dev') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Upsert seed courses to ensure they're published
INSERT INTO public.courses (slug, title, description, difficulty, ai_generated, published)
VALUES 
  ('crypto-intro', 'Crypto Fundamentals — A Plain English Guide', 'Text-first course covering blockchain basics, wallets, transactions, and a short glossary. No videos. Easy language for newcomers.', 'Beginner', false, true),
  ('defi-basics', 'DeFi Basics — Lending, AMMs, and Risks', 'Plain-language explanations of lending protocols, automated market makers, liquidity pools, and core risks.', 'Beginner', false, true),
  ('blockchain-tools', 'Practical Blockchain Tools — Wallets, Explorers, and CLI', 'How to use common blockchain tools, explorers, simple CLI commands and safe practices. Text-first, step-by-step instructions.', 'Intermediate', false, true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  published = true;