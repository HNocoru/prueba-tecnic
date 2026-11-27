-- Solicitudes creadas desde la IA: trazabilidad, vínculo a conversación y guardas de duplicados.
ALTER TABLE public.requests
  ADD COLUMN conversation_id uuid,
  ADD COLUMN source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.requests
  ADD CONSTRAINT requests_source_check CHECK (source IN ('manual', 'ai')),
  ADD CONSTRAINT requests_tenant_conversation_fkey
    FOREIGN KEY (tenant_id, conversation_id)
    REFERENCES public.conversations (tenant_id, id);

CREATE INDEX ix_requests_tenant_conversation
  ON public.requests (tenant_id, conversation_id);

-- Impide dos solicitudes abiertas (pending/in_progress) con el mismo título normalizado por contacto.
CREATE UNIQUE INDEX ux_requests_open_normalized_title
  ON public.requests (
    tenant_id,
    contact_id,
    lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))
  )
  WHERE status IN ('pending', 'in_progress');

-- Realtime para solicitudes (mismo patrón que 20260104000000_realtime_inbox.sql).
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['requests'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
