
-- support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  attachment_url text,
  assigned_photographer_id uuid,
  event_id uuid,
  photo_id uuid,
  photo_url text,
  status text NOT NULL DEFAULT 'aberto',
  admin_response text,
  escalate_after timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id);
CREATE INDEX support_tickets_photographer_idx ON public.support_tickets(assigned_photographer_id);
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX support_tickets_escalate_idx ON public.support_tickets(escalate_after) WHERE status <> 'resolvido';

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Authenticated user creates their own ticket
CREATE POLICY "Users insert own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Submitter can view their tickets
CREATE POLICY "Users view own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Assigned photographer can view while still within deadline (24h not expired and not resolved by admin)
CREATE POLICY "Photographer views assigned tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  assigned_photographer_id = auth.uid()
  AND (escalate_after IS NULL OR escalate_after > now() OR status = 'resolvido')
);

-- Assigned photographer can update (resolve / answer) while within deadline
CREATE POLICY "Photographer updates assigned tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (
  assigned_photographer_id = auth.uid()
  AND (escalate_after IS NULL OR escalate_after > now())
  AND status <> 'resolvido'
)
WITH CHECK (
  assigned_photographer_id = auth.uid()
);

-- Super admin full access
CREATE POLICY "Super admin reads all tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super admin updates all tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- updated_at trigger
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies on support-attachments bucket
-- Path format: <user_id>/<ticket_id>/<filename>
CREATE POLICY "Users upload own support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Photographer reads assigned ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.attachment_url = storage.objects.name
      AND t.assigned_photographer_id = auth.uid()
      AND (t.escalate_after IS NULL OR t.escalate_after > now() OR t.status = 'resolvido')
  )
);

CREATE POLICY "Super admin reads all support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND is_super_admin()
);
