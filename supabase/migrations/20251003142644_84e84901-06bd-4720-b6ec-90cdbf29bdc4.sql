-- Enable RLS on nonces table
ALTER TABLE public.nonces ENABLE ROW LEVEL SECURITY;

-- Add policy for nonces (only admins can manage nonces for security)
CREATE POLICY "Admins can manage nonces"
ON public.nonces
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit logs (admins can view all, users can view their own)
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));