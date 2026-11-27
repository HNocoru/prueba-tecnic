-- S19: tabla contact_memory, check de secretos, FK compuesta y aislamiento por tenant (pgTAP).
BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');
INSERT INTO public.tenants (id, slug, name) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'tenant-a', 'A'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'tenant-b', 'B');
INSERT INTO public.tenant_members (tenant_id, user_id) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-00000000000b');
INSERT INTO public.contacts (id, tenant_id, wa_id) VALUES
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', '5215500000001'),
  ('bbbbbbbb-2222-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', '5215500000002');

SELECT ok(to_regclass('public.contact_memory') IS NOT NULL, 'contact_memory existe');
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE oid = 'public.contact_memory'::regclass
    AND relrowsecurity AND relforcerowsecurity),
  1, 'contact_memory: RLS enable+force');

SELECT lives_ok($$INSERT INTO public.contact_memory (tenant_id, contact_id, summary, facts)
  VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 'Resumen A', '{"ciudad":"CDMX"}'::jsonb)$$,
  'hechos sin secretos se guardan');
SELECT lives_ok($$INSERT INTO public.contact_memory (tenant_id, contact_id, summary)
  VALUES ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-2222-4000-8000-000000000002', 'Resumen B')$$,
  'memoria vacía por defecto');
SELECT throws_ok($$INSERT INTO public.contact_memory (tenant_id, contact_id, summary)
  VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 'duplicado')$$,
  '23505', NULL, 'PK (tenant_id, contact_id) rechaza duplicados');
SELECT throws_ok($$INSERT INTO public.contact_memory (tenant_id, contact_id, summary)
  VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'bbbbbbbb-2222-4000-8000-000000000002', 'cruce')$$,
  '23503', NULL, 'FK compuesta rechaza contacto de otro tenant');
SELECT throws_ok($$UPDATE public.contact_memory SET facts = '{"api_key":"abc"}'::jsonb
  WHERE tenant_id = 'aaaaaaaa-1111-4000-8000-000000000001'$$,
  '23514', NULL, 'secretos rechazados en facts');
SELECT is(
  (SELECT summary FROM public.contact_memory
    WHERE tenant_id = 'aaaaaaaa-1111-4000-8000-000000000001'),
  'Resumen A'::text, 'los hechos no alteran el resumen');

-- Usuario del tenant A
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.contact_memory), 1::bigint, 'A solo ve su memoria');
SELECT is((SELECT count(*) FROM public.contact_memory
  WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no lee memoria de B');
SELECT throws_ok($$INSERT INTO public.contact_memory (tenant_id, contact_id, summary)
  VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 'hack')$$,
  '42501', NULL, 'authenticated no escribe memoria');

-- anon
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok($$SELECT count(*) FROM public.contact_memory$$, '42501', NULL, 'anon no lee memoria');

-- Usuario del tenant B
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-00000000000b","role":"authenticated"}', true);
SELECT is((SELECT summary FROM public.contact_memory), 'Resumen B'::text, 'B conserva su memoria intacta');

SELECT * FROM finish();
ROLLBACK;
