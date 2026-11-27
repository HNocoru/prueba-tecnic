-- call_turns: un (call_id, position) no se repite; el reintento con ON CONFLICT no inserta filas (pgTAP).
BEGIN;
SELECT plan(4);

INSERT INTO public.tenants (id, slug, name) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'tenant-a', 'A');
INSERT INTO public.contacts (id, tenant_id, wa_id) VALUES
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', '5215500000001');
INSERT INTO public.conversations (id, tenant_id, contact_id) VALUES
  ('aaaaaaaa-3333-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001');
INSERT INTO public.calls (id, tenant_id, conversation_id, wa_call_id) VALUES
  ('aaaaaaaa-7777-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001', 'wacid.T1');
INSERT INTO public.call_turns (tenant_id, call_id, role, text, position) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-7777-4000-8000-000000000001', 'user', 'Hola', 1);

SELECT is(
  (SELECT count(*)::int FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'call_turns' AND indexdef LIKE 'CREATE UNIQUE INDEX%(call_id, "position")%'
       OR schemaname = 'public' AND tablename = 'call_turns' AND indexdef LIKE 'CREATE UNIQUE INDEX%(call_id, position)%'),
  1, 'call_turns tiene índice único (call_id, position)');

SELECT throws_ok(
  $$INSERT INTO public.call_turns (tenant_id, call_id, role, text, position)
    VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-7777-4000-8000-000000000001', 'user', 'Otra vez', 1)$$,
  '23505', NULL, 'un turno con el mismo (call_id, position) se rechaza');

INSERT INTO public.call_turns (tenant_id, call_id, role, text, position) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-7777-4000-8000-000000000001', 'user', 'Otra vez', 1)
  ON CONFLICT (call_id, position) DO NOTHING;

SELECT is((SELECT count(*)::int FROM public.call_turns WHERE call_id = 'aaaaaaaa-7777-4000-8000-000000000001'), 1,
  'ON CONFLICT DO NOTHING no inserta filas nuevas');
SELECT is((SELECT text FROM public.call_turns WHERE call_id = 'aaaaaaaa-7777-4000-8000-000000000001'), 'Hola',
  'la fila original no cambia');

SELECT * FROM finish();
ROLLBACK;
