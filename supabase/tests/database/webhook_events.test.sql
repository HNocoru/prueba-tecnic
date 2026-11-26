-- webhook_events: RLS forzada, sin acceso para anon/authenticated, idempotencia por (provider, event_id) (pgTAP).
BEGIN;
SELECT plan(7);

INSERT INTO public.webhook_events (provider, event_id, payload) VALUES ('whatsapp', 'wamid.A', '{}');

SELECT is(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.webhook_events'::regclass),
  true, 'webhook_events tiene RLS habilitada y forzada');

SELECT is((SELECT count(*)::int FROM pg_policies WHERE tablename = 'webhook_events'), 0,
  'webhook_events no tiene policies');

SELECT throws_ok(
  $$INSERT INTO public.webhook_events (provider, event_id, payload) VALUES ('whatsapp', 'wamid.A', '{}')$$,
  '23505', NULL, 'un evento duplicado (provider, event_id) se rechaza');

SELECT lives_ok(
  $$INSERT INTO public.webhook_events (tenant_id, provider, event_id, payload, error)
    VALUES (NULL, 'whatsapp', 'wamid.B', '{}', 'tenant no resuelto')$$,
  'se acepta un evento sin tenant resuelto');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT count(*) FROM public.webhook_events$$, '42501', NULL, 'anon no puede leer webhook_events');
SELECT throws_ok(
  $$INSERT INTO public.webhook_events (provider, event_id, payload) VALUES ('whatsapp', 'wamid.C', '{}')$$,
  '42501', NULL, 'anon no puede escribir webhook_events');

SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT count(*) FROM public.webhook_events$$, '42501', NULL, 'authenticated no puede leer webhook_events');

SELECT * FROM finish();
ROLLBACK;
