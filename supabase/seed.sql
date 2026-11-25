-- Tenant demo (uuid fijo; el usuario demo se crea con scripts/seed-demo-user.mts).
INSERT INTO public.tenants (id, slug, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'demo', 'Negocio Demo')
ON CONFLICT (id) DO NOTHING;
