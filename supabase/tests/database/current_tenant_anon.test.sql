-- Seguridad de public.current_tenant(): sin EXECUTE para anon/PUBLIC y search_path fijo (pgTAP).
BEGIN;
SELECT plan(5);

SELECT is(
  has_function_privilege('anon', 'public.current_tenant()', 'EXECUTE'),
  false,
  'current_tenant: anon no tiene EXECUTE'
);

SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = 'public.current_tenant()'::regprocedure
      AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'),
  0,
  'current_tenant: PUBLIC no tiene EXECUTE'
);

SELECT is(
  has_function_privilege('authenticated', 'public.current_tenant()', 'EXECUTE'),
  true,
  'current_tenant: authenticated conserva EXECUTE'
);

SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.current_tenant()'::regprocedure),
  'current_tenant: es SECURITY DEFINER'
);

SELECT ok(
  (SELECT coalesce(p.proconfig, '{}') @> ARRAY['search_path=""']
     FROM pg_proc p WHERE p.oid = 'public.current_tenant()'::regprocedure),
  'current_tenant: search_path fijado en vacío'
);

SELECT * FROM finish();
ROLLBACK;
