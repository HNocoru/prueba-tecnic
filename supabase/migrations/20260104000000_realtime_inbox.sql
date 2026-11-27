-- Slice S03: Realtime en la bandeja.
-- Publica solo las tablas que la bandeja escucha. No toca políticas: Realtime
-- (postgres_changes) evalúa la RLS de SELECT con el JWT del suscriptor, así que
-- cada usuario solo recibe cambios de los tenants de current_tenant().
DO $$
DECLARE t text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    FOREACH t IN ARRAY ARRAY['messages', 'conversations', 'calls'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
