
-- Enums
CREATE TYPE public.application_status AS ENUM ('pendente', 'aceita', 'rejeitada', 'cancelada');
CREATE TYPE public.proposal_status AS ENUM ('rascunho', 'enviada', 'em_negociacao', 'aceita', 'rejeitada', 'encerrada');

-- ============ event_applications ============
CREATE TABLE public.event_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  photographer_id UUID NOT NULL,
  message TEXT,
  suggested_fee NUMERIC,
  status public.application_status NOT NULL DEFAULT 'pendente',
  organizer_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, photographer_id)
);

ALTER TABLE public.event_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographer manages own applications"
  ON public.event_applications FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Organizer sees applications of own events"
  ON public.event_applications FOR SELECT
  USING (public.is_event_organizer(event_id));

CREATE POLICY "Organizer can respond applications"
  ON public.event_applications FOR UPDATE
  USING (public.is_event_organizer(event_id));

CREATE POLICY "Super admin reads all applications"
  ON public.event_applications FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE TRIGGER trg_event_applications_updated_at
  BEFORE UPDATE ON public.event_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_applications_event ON public.event_applications(event_id);
CREATE INDEX idx_applications_photographer ON public.event_applications(photographer_id);

-- ============ proposals ============
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  organizer_id UUID NOT NULL,
  photographer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  fee NUMERIC,
  deadline DATE,
  status public.proposal_status NOT NULL DEFAULT 'enviada',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view proposals"
  ON public.proposals FOR SELECT
  USING (organizer_id = auth.uid() OR photographer_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Organizer of event can insert proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (public.is_event_organizer(event_id) OR photographer_id = auth.uid())
  );

CREATE POLICY "Parties can update proposals"
  ON public.proposals FOR UPDATE
  USING (organizer_id = auth.uid() OR photographer_id = auth.uid());

CREATE POLICY "Parties can delete own draft proposals"
  ON public.proposals FOR DELETE
  USING ((organizer_id = auth.uid() OR photographer_id = auth.uid()) AND status = 'rascunho');

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_proposals_event ON public.proposals(event_id);
CREATE INDEX idx_proposals_photographer ON public.proposals(photographer_id);
CREATE INDEX idx_proposals_organizer ON public.proposals(organizer_id);

-- helper to check proposal participation (avoid recursion)
CREATE OR REPLACE FUNCTION public.is_proposal_party(_proposal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = _proposal_id
      AND (organizer_id = auth.uid() OR photographer_id = auth.uid())
  )
$$;

-- ============ proposal_comments ============
CREATE TABLE public.proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view comments"
  ON public.proposal_comments FOR SELECT
  USING (public.is_proposal_party(proposal_id) OR public.is_super_admin());

CREATE POLICY "Parties insert comments"
  ON public.proposal_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.is_proposal_party(proposal_id));

CREATE POLICY "Author deletes own comment"
  ON public.proposal_comments FOR DELETE
  USING (author_id = auth.uid());

CREATE INDEX idx_proposal_comments_proposal ON public.proposal_comments(proposal_id);

-- ============ proposal_attachments ============
CREATE TABLE public.proposal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view attachments"
  ON public.proposal_attachments FOR SELECT
  USING (public.is_proposal_party(proposal_id) OR public.is_super_admin());

CREATE POLICY "Parties insert attachments"
  ON public.proposal_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid() AND public.is_proposal_party(proposal_id));

CREATE POLICY "Uploader deletes own attachment"
  ON public.proposal_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE INDEX idx_proposal_attachments_proposal ON public.proposal_attachments(proposal_id);

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload to own folder (proposals)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proposal-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Parties read proposal attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'proposal-attachments'
    AND EXISTS (
      SELECT 1 FROM public.proposal_attachments pa
      WHERE pa.file_path = storage.objects.name
        AND (public.is_proposal_party(pa.proposal_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "Uploader deletes own storage attachment"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'proposal-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
