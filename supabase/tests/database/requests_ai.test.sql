-- IA en solicitudes: columnas, checks, FK compuesta, unicidad abierta y Realtime (pgTAP).
BEGIN;
SELECT plan(11);

INSERT INTO public.tenants (id, slug, name) VALUES
  ('aaaaaaaa-1111-4000-8000-0000000000a1', 'ai-a', 'A'),
  ('bbbbbbbb-1111-4000-8000-0000000000b1', 'ai-b', 'B');
INSERT INTO public.contacts (id, tenant_id, wa_id) VALUES
  ('aaaaaaaa-2222-4000-8000-0000000000a1', 'aaaaaaaa-1111-4000-8000-0000000000a1', '5215500000091'),
  ('bbbbbbbb-2222-4000-8000-0000000000b1', 'bbbbbbbb-1111-4000-8000-0000000000b1', '5215500000092');
INSERT INTO public.conversations (id, tenant_id, contact_id) VALUES
  ('aaaaaaaa-3333-4000-8000-0000000000a1', 'aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1'),
  ('bbbbbbbb-3333-4000-8000-0000000000b1', 'bbbbbbbb-1111-4000-8000-0000000000b1', 'bbbbbbbb-2222-4000-8000-0000000000b1');

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'conversation_id'
  ),
  'requests.conversation_id existe'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'source'
      AND column_default LIKE '%manual%'
  ),
  'requests.source existe con default manual'
);

SELECT lives_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, conversation_id, title, status, source)
  VALUES ('aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1', 'aaaaaaaa-3333-4000-8000-0000000000a1', 'Corte de cabello', 'pending', 'ai')
$$, 'inserta solicitud ai con conversación del mismo tenant');

SELECT throws_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, title, status, source)
  VALUES ('aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1', 'X', 'pending', 'bot')
$$, '23514', NULL, 'source inválido rechazado');

SELECT throws_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, conversation_id, title, status, source)
  VALUES ('aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1', 'bbbbbbbb-3333-4000-8000-0000000000b1', 'X', 'pending', 'ai')
$$, '23503', NULL, 'FK compuesta rechaza conversación de otro tenant');

SELECT throws_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, title, status, source)
  VALUES ('aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1', '  corte  de   cabello ', 'in_progress', 'ai')
$$, '23505', NULL, 'título normalizado duplicado rechazado en abierta');

SELECT lives_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, title, status, source)
  VALUES ('aaaaaaaa-1111-4000-8000-0000000000a1', 'aaaaaaaa-2222-4000-8000-0000000000a1', 'Corte de cabello', 'completed', 'manual')
$$, 'misma solicitud cerrada no choca con la abierta');

SELECT lives_ok($$
  INSERT INTO public.requests (tenant_id, contact_id, title, status, source)
  VALUES ('bbbbbbbb-1111-4000-8000-0000000000b1', 'bbbbbbbb-2222-4000-8000-0000000000b1', 'Corte de cabello', 'pending', 'ai')
$$, 'mismo título normalizado permitido en otro contacto/tenant');

SELECT is(
  (SELECT count(*)::int FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requests'),
  1, 'requests publicada en supabase_realtime'
);

SELECT is(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.requests'::regclass),
  true, 'requests conserva RLS enable+force'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'requests' AND indexname = 'ux_requests_open_normalized_title'
  ),
  'existe índice único parcial de títulos abiertos normalizados'
);

SELECT * FROM finish();
ROLLBACK;
