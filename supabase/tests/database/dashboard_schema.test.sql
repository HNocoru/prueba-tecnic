-- Esquema del dashboard: RLS forzada, aislamiento por tenant, checks y FK compuestas (pgTAP).
BEGIN;
SELECT plan(29);

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
INSERT INTO public.conversations (id, tenant_id, contact_id) VALUES
  ('aaaaaaaa-3333-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001'),
  ('bbbbbbbb-3333-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-2222-4000-8000-000000000002');
INSERT INTO public.business_profiles (tenant_id, legal_name) VALUES
  ('aaaaaaaa-1111-4000-8000-000000000001', 'Negocio A'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'Negocio B');
INSERT INTO public.catalog_items (id, tenant_id, kind, name) VALUES
  ('aaaaaaaa-4444-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'product', 'Item A'),
  ('bbbbbbbb-4444-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', 'product', 'Item B');
INSERT INTO public.messages (id, tenant_id, conversation_id, direction, kind, body) VALUES
  ('aaaaaaaa-5555-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001', 'inbound', 'text', 'hola A'),
  ('bbbbbbbb-5555-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-3333-4000-8000-000000000002', 'inbound', 'text', 'hola B');
INSERT INTO public.requests (id, tenant_id, contact_id, title) VALUES
  ('aaaaaaaa-6666-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 'Req A'),
  ('bbbbbbbb-6666-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-2222-4000-8000-000000000002', 'Req B');
INSERT INTO public.profiles (user_id, full_name) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Ana'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Beto');

-- RLS enable+force en todas las tablas nuevas
SELECT is(
  (SELECT count(*)::int FROM pg_class
    WHERE oid = ANY (ARRAY['public.profiles','public.business_profiles','public.business_hours','public.catalog_items',
      'public.faqs','public.assistant_configs','public.whatsapp_numbers','public.conversations','public.messages',
      'public.calls','public.call_turns','public.requests']::regclass[])
      AND relrowsecurity AND relforcerowsecurity),
  12, 'las 12 tablas nuevas tienen RLS enable+force');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass), 'profiles: force');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.messages'::regclass), 'messages: force');
SELECT ok((SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.requests'::regclass), 'requests: force');

-- Restricciones (como superusuario)
SELECT throws_ok($$INSERT INTO public.catalog_items (tenant_id, kind, name) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'otro', 'x')$$, '23514', NULL, 'catalog_items.kind inválido');
SELECT throws_ok($$INSERT INTO public.catalog_items (tenant_id, kind, name, price) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'product', 'x', -1)$$, '23514', NULL, 'price negativo rechazado');
SELECT throws_ok($$INSERT INTO public.requests (tenant_id, contact_id, title, status) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 't', 'raro')$$, '23514', NULL, 'requests.status inválido');
SELECT lives_ok($$INSERT INTO public.requests (tenant_id, contact_id, title, status) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-2222-4000-8000-000000000001', 't', 'none')$$, 'requests.status none válido');
SELECT throws_ok($$INSERT INTO public.messages (tenant_id, conversation_id, direction, kind) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001', 'sideways', 'text')$$, '23514', NULL, 'messages.direction inválida');
SELECT throws_ok($$INSERT INTO public.messages (tenant_id, conversation_id, direction, kind) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001', 'inbound', 'video')$$, '23514', NULL, 'messages.kind inválido');
SELECT throws_ok($$INSERT INTO public.whatsapp_numbers (tenant_id, phone_number_id, status) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'p1', 'raro')$$, '23514', NULL, 'whatsapp_numbers.status inválido');
SELECT throws_ok($$INSERT INTO public.calls (tenant_id, conversation_id, outcome) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001', 'raro')$$, '23514', NULL, 'calls.outcome inválido');
SELECT throws_ok($$INSERT INTO public.business_hours (tenant_id, weekday, opens, closes) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 7, '09:00', '18:00')$$, '23514', NULL, 'weekday fuera de 0-6');
SELECT throws_ok($$INSERT INTO public.business_hours (tenant_id, weekday, opens, closes) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 1, '18:00', '09:00')$$, '23514', NULL, 'opens debe ser < closes');
SELECT throws_ok($$INSERT INTO public.assistant_configs (tenant_id, mascot) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', '{"api_key":"abc"}')$$, '23514', NULL, 'secretos rechazados en mascot');
SELECT throws_ok($$UPDATE public.profiles SET age = 0 WHERE user_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$$, '23514', NULL, 'age 0 rechazada');
SELECT throws_ok($$UPDATE public.profiles SET age = 130 WHERE user_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$$, '23514', NULL, 'age 130 rechazada');
SELECT lives_ok($$UPDATE public.profiles SET age = 30 WHERE user_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$$, 'age 30 válida');

-- FK compuesta: mensaje de tenant A con conversación de tenant B
SELECT throws_ok($$INSERT INTO public.messages (tenant_id, conversation_id, direction, kind) VALUES ('aaaaaaaa-1111-4000-8000-000000000001', 'bbbbbbbb-3333-4000-8000-000000000002', 'inbound', 'text')$$, '23503', NULL, 'FK compuesta rechaza conversación de otro tenant');

-- Usuario del tenant A
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.business_profiles WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no lee business_profiles de B');
SELECT is((SELECT count(*) FROM public.catalog_items WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no lee catalog_items de B');
SELECT is((SELECT count(*) FROM public.messages WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no lee messages de B');
SELECT is((SELECT count(*) FROM public.requests WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002'), 0::bigint, 'A no lee requests de B');
SELECT throws_ok($$INSERT INTO public.catalog_items (tenant_id, kind, name) VALUES ('bbbbbbbb-1111-4000-8000-000000000002', 'product', 'x')$$, '42501', NULL, 'A no inserta catalog_items en B');
SELECT throws_ok($$INSERT INTO public.requests (tenant_id, contact_id, title) VALUES ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-2222-4000-8000-000000000002', 'x')$$, '42501', NULL, 'A no inserta requests en B');
SELECT throws_ok($$INSERT INTO public.messages (tenant_id, conversation_id, direction, kind) VALUES ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-3333-4000-8000-000000000002', 'inbound', 'text')$$, '42501', NULL, 'A no inserta messages en B');
UPDATE public.business_profiles SET legal_name = 'hack' WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002';
UPDATE public.catalog_items SET name = 'hack' WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002';
UPDATE public.messages SET body = 'hack' WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002';
UPDATE public.requests SET title = 'hack' WHERE tenant_id = 'bbbbbbbb-1111-4000-8000-000000000002';

-- profiles: A solo ve el suyo
SELECT results_eq($$SELECT full_name FROM public.profiles$$, $$VALUES ('Ana'::text)$$, 'A solo ve su perfil, no el de B');

-- Los UPDATE de A sobre B no surtieron efecto (verifica como B)
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-00000000000b","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.business_profiles WHERE legal_name = 'Negocio B')
        + (SELECT count(*) FROM public.catalog_items WHERE name = 'Item B')
        + (SELECT count(*) FROM public.messages WHERE body = 'hola B')
        + (SELECT count(*) FROM public.requests WHERE title = 'Req B'), 4::bigint, 'B conserva sus filas intactas');

-- anon
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok($$SELECT count(*) FROM public.messages$$, '42501', NULL, 'anon no lee messages');

SELECT * FROM finish();
ROLLBACK;
