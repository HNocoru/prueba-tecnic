-- Permisos explícitos para service_role (cliente de servidor: webhook, llamadas, scripts).
--
-- Supabase local da a service_role privilegios por defecto sobre las tablas nuevas del
-- esquema public, pero un proyecto hospedado puede NO hacerlo: ahí las tablas creadas por
-- migraciones quedan sin permisos para este rol y el servidor falla con
-- "permission denied for table ..." (código 42501). Este archivo lo hace explícito.
--
-- service_role se salta la RLS por diseño; solo lo usa código de servidor (nunca el navegador).
-- No toca a anon ni a authenticated: sus permisos siguen siendo los de cada migración.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Tablas, secuencias y funciones que se creen después con este mismo rol dueño (postgres).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
