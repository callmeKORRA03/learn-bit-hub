-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with profiles
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE,
  username text UNIQUE,
  first_name text,
  last_name text,
  profile_pic_url text,
  xp integer DEFAULT 0,
  bitcred_balance numeric DEFAULT 10,
  active_course_count integer DEFAULT 0,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  difficulty text,
  ai_generated boolean DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  order_index integer NOT NULL DEFAULT 0,
  estimated_time_minutes integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress_percent numeric DEFAULT 0,
  active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  quiz_json jsonb,
  passing_threshold integer DEFAULT 80,
  created_at timestamptz DEFAULT now()
);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score integer,
  attempt_at timestamptz DEFAULT now()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  pdf_url text,
  signature text,
  signer_metadata jsonb,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action_type text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Courses are viewable by everyone" ON public.courses FOR SELECT USING (published = true);
CREATE POLICY "Chapters are viewable by everyone" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Quizzes are viewable by everyone" ON public.quizzes FOR SELECT USING (true);

-- RLS Policies for user-specific data
CREATE POLICY "Users can view their own enrollments" ON public.enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own enrollments" ON public.enrollments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own enrollments" ON public.enrollments FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view their own quiz attempts" ON public.quiz_attempts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own certificates" ON public.certificates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Certificates are publicly viewable" ON public.certificates FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_courses_slug ON public.courses(slug);
CREATE INDEX idx_chapters_course_id ON public.chapters(course_id);
CREATE INDEX idx_lessons_chapter_id ON public.lessons(chapter_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);

-- Insert seed data for courses
-- Course 1: Crypto Fundamentals
INSERT INTO public.courses (slug, title, description, difficulty, ai_generated, published) 
VALUES (
  'crypto-intro',
  'Crypto Fundamentals — A Plain English Guide',
  'Text-first course covering blockchain basics, wallets, transactions, and a short glossary. No videos. Easy language for newcomers.',
  'Beginner',
  false,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Get the course_id for crypto-intro
DO $$
DECLARE
  course1_id uuid;
  chapter1_id uuid;
  chapter2_id uuid;
BEGIN
  SELECT id INTO course1_id FROM public.courses WHERE slug = 'crypto-intro';
  
  -- Chapter 1
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course1_id, 'Why Crypto? Basics and Motivation', 1)
  RETURNING id INTO chapter1_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter1_id, 'What is a blockchain?', 'A blockchain is a distributed ledger: an ordered list of blocks where each block references the previous block''s hash. Blocks contain transactions. Blockchains are append-only which makes them tamper-resistant. Example: Bitcoin and many public networks.', 1),
    (chapter1_id, 'Public vs private chains', 'Public chains are open to anyone to read and participate. Private chains restrict who can join and are used by enterprises. This course focuses on public chain concepts.', 2);
  
  -- Chapter 2
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course1_id, 'Wallets and Keys', 2)
  RETURNING id INTO chapter2_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter2_id, 'Private key vs public key vs address', 'Private keys control funds and must be kept secret. Public keys are derived from private keys; addresses are shorter representations used to receive funds. Never share your private key.', 1),
    (chapter2_id, 'Basic wallet hygiene', 'Use hardware wallets for significant holdings, keep backups encrypted, use password managers, and beware phishing sites.', 2);
END $$;

-- Course 2: DeFi Basics
INSERT INTO public.courses (slug, title, description, difficulty, ai_generated, published) 
VALUES (
  'defi-basics',
  'DeFi Basics — Lending, AMMs, and Risks',
  'Plain-language explanations of lending protocols, automated market makers, liquidity pools, and core risks.',
  'Beginner',
  false,
  true
) ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  course2_id uuid;
  chapter1_id uuid;
  chapter2_id uuid;
BEGIN
  SELECT id INTO course2_id FROM public.courses WHERE slug = 'defi-basics';
  
  -- Chapter 1
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course2_id, 'Core Concepts', 1)
  RETURNING id INTO chapter1_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter1_id, 'What is DeFi?', 'DeFi stands for decentralized finance. It offers financial services (lending, trading, derivatives) without traditional intermediaries using smart contracts.', 1),
    (chapter1_id, 'Automated Market Makers (AMMs)', 'AMMs are smart contracts that provide liquidity pools for trading. Prices are determined by formulas such as x * y = k. Common platforms: Uniswap, PancakeSwap.', 2);
  
  -- Chapter 2
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course2_id, 'Risks and Best Practices', 2)
  RETURNING id INTO chapter2_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter2_id, 'Smart contract risk', 'Smart contracts can contain bugs. Only use audited contracts for large amounts. Diversify and avoid unaudited pools.', 1);
END $$;

-- Course 3: Blockchain Tools
INSERT INTO public.courses (slug, title, description, difficulty, ai_generated, published) 
VALUES (
  'blockchain-tools',
  'Practical Blockchain Tools — Wallets, Explorers, and CLI',
  'How to use common blockchain tools, explorers, simple CLI commands and safe practices. Text-first, step-by-step instructions.',
  'Intermediate',
  false,
  true
) ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  course3_id uuid;
  chapter1_id uuid;
  chapter2_id uuid;
BEGIN
  SELECT id INTO course3_id FROM public.courses WHERE slug = 'blockchain-tools';
  
  -- Chapter 1
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course3_id, 'Using Block Explorers', 1)
  RETURNING id INTO chapter1_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter1_id, 'Reading transactions', 'Block explorers let you search for addresses and view transactions, confirmations, and fees. Example: how to check a tx hash and interpret inputs/outputs.', 1);
  
  -- Chapter 2
  INSERT INTO public.chapters (course_id, title, order_index)
  VALUES (course3_id, 'CLI tools and wallets', 2)
  RETURNING id INTO chapter2_id;
  
  INSERT INTO public.lessons (chapter_id, title, content, order_index)
  VALUES 
    (chapter2_id, 'Common CLI commands', 'This lesson provides safe example commands for viewing balances and transaction history using common CLIs. Avoid sharing private keys; use read-only commands.', 1);
END $$;