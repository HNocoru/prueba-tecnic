-- La bandeja en tiempo real solo publica messages, conversations y calls; la RLS sigue forzada.
BEGIN;
SELECT plan(5);

SELECT is(
  (SELECT string_agg(tablename::text, ',' ORDER BY tablename::text) FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'),
  'calls,conversations,messages',
  'supabase_realtime publica exactamente calls, conversations y messages'
);
SELECT is(
  (SELECT count(*)::int FROM pg_class
    WHERE oid = ANY (ARRAY['public.messages','public.conversations','public.calls']::regclass[])
      AND relrowsecurity AND relforcerowsecurity),
  3, 'las tablas publicadas conservan RLS enable+force'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('messages','conversations','calls') AND cmd = 'SELECT'),
  3, 'cada tabla publicada tiene su política SELECT por tenant'
);
SELECT is(
  (SELECT count(*)::int FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tenant_members'),
  0, 'tenant_members no se publica'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('messages','conversations','calls') AND 'anon' = ANY (roles)),
  0, 'anon no tiene políticas sobre las tablas publicadas'
);

SELECT * FROM finish();
ROLLBACK;
