-- Add timer_minutes to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS timer_minutes integer DEFAULT 3;

-- Add status and feedback to quiz_attempts
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback jsonb;

-- Update certificates table for approval workflow
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Add constraint for certificate status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'certificates_status_check'
  ) THEN
    ALTER TABLE public.certificates
    ADD CONSTRAINT certificates_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);