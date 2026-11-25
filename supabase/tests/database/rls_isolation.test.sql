-- Aislamiento multi-tenant, unicidad, guard de redacción y secretos (pgTAP).
BEGIN;
SELECT plan(19);

-- Fixtures (como superusuario)
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');
INSERT INTO public.tenants (id, slug, name) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'tenant-a', 'A'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'tenant-b', 'B');
INSERT INTO public.tenant_members (tenant_id, user_id) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-00000000000b');
INSERT INTO public.contacts (id, tenant_id, wa_id, name) VALUES
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', '5215500000001', 'Ana A'),
  ('bbbbbbbb-2222-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', '5215500000002', 'Beto B');

SELECT ok((SELECT relforcerowsecurity AND relrowsecurity FROM pg_class WHERE oid = 'public.contacts'::regclass), 'contacts: RLS enable+force');
SELECT ok((SELECT relforcerowsecurity AND relrowsecurity FROM pg_class WHERE oid = 'public.tenants'::regclass), 'tenants: RLS enable+force');
SELECT ok((SELECT relforcerowsecurity AND relrowsecurity FROM pg_class WHERE oid = 'public.tenant_members'::regclass), 'tenant_members: RLS enable+force');

-- Mismo wa_id permitido en distintos tenants (como superusuario)
SELECT lives_ok($$INSERT INTO public.contacts (tenant_id, wa_id) VALUES ('bbbbbbbb-1111-4000-8000-000000000002', '5215500000001')$$,
  'mismo wa_id permitido en otro tenant');

-- Usuario del tenant A
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.contacts), 1::bigint, 'A solo ve 1 contacto');
SELECT is((SELECT count(*) FROM public.contacts WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no ve contactos de B');
SELECT is((SELECT count(*) FROM public.tenants), 1::bigint, 'A solo ve su tenant');
SELECT is((SELECT count(*) FROM public.tenant_members), 1::bigint, 'A solo ve sus membresías');

SELECT throws_ok($$INSERT INTO public.contacts (tenant_id, wa_id) VALUES ('bbbbbbbb-1111-4000-8000-000000000002', '5215500000003')$$,
  '42501', NULL, 'A no puede insertar contactos en B');

UPDATE public.contacts SET name = 'hack' WHERE id = 'bbbbbbbb-2222-4000-8000-000000000002';
DELETE FROM public.contacts WHERE id = 'bbbbbbbb-2222-4000-8000-000000000002';

SELECT throws_ok($$UPDATE public.contacts SET tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002' WHERE id = 'aaaaaaaa-2222-4000-8000-000000000001'$$,
  'P0001', NULL, 'tenant_id inmutable: A no puede mover un contacto a B');

SELECT throws_ok($$INSERT INTO public.contacts (tenant_id, wa_id) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', '5215500000001')$$,
  '23505', NULL, 'UNIQUE (tenant_id, wa_id) en el mismo tenant');
SELECT throws_ok($$INSERT INTO public.contacts (tenant_id, wa_id, phone_e164) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'x1', '5215500000001')$$,
  '23514', NULL, 'phone_e164 inválido rechazado');
SELECT lives_ok($$INSERT INTO public.contacts (tenant_id, wa_id, phone_e164) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'x2', '+5215500000009')$$,
  'phone_e164 válido aceptado');

-- Guard de redacción
SELECT throws_ok($$UPDATE public.contacts SET redacted_at = now() WHERE id = 'aaaaaaaa-2222-4000-8000-000000000001'$$,
  'P0001', NULL, 'redacted_at exige name NULL y attributes {}');
SELECT lives_ok($$UPDATE public.contacts SET redacted_at = now(), name = NULL, attributes = '{}' WHERE id = 'aaaaaaaa-2222-4000-8000-000000000001'$$,
  'redacción válida');
SELECT throws_ok($$UPDATE public.contacts SET name = 'otra vez' WHERE id = 'aaaaaaaa-2222-4000-8000-000000000001'$$,
  'P0001', NULL, 'contacto anonimizado no se recupera');

-- Secretos en settings (como superusuario)
RESET ROLE;
SELECT throws_ok($$INSERT INTO public.tenants (slug, name, settings) VALUES ('s', 's', '{"api_key":"abc"}')$$,
  '23514', NULL, 'secretos rechazados en tenants.settings');

-- B conserva lo suyo (update/delete de A no surtieron efecto)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-00000000000b","role":"authenticated"}', true);
SELECT results_eq($$SELECT name FROM public.contacts WHERE wa_id = '5215500000002'$$, $$VALUES ('Beto B'::text)$$, 'B conserva su contacto intacto');

-- anon no ve nada
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok($$SELECT count(*) FROM public.contacts$$, '42501', NULL, 'anon no puede leer contacts');

SELECT * FROM finish();
ROLLBACK;
