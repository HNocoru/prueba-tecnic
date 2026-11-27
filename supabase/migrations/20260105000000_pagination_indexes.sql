-- S04: índices para paginación keyset por (fecha, id) y búsqueda de contacto por id.
-- Los índices anteriores no incluían el id como desempate del cursor.

DROP INDEX IF EXISTS public.ix_conversations_tenant_activity;
CREATE INDEX ix_conversations_tenant_activity_id
    ON public.conversations (tenant_id, last_activity_at DESC, id DESC);

DROP INDEX IF EXISTS public.ix_messages_conversation_occurred;
CREATE INDEX ix_messages_conversation_occurred_id
    ON public.messages (conversation_id, occurred_at DESC, id DESC);

DROP INDEX IF EXISTS public.ix_calls_conversation_started;
CREATE INDEX ix_calls_conversation_started_id
    ON public.calls (conversation_id, started_at DESC, id DESC);

CREATE INDEX ix_contacts_tenant_created_id
    ON public.contacts (tenant_id, created_at DESC, id DESC);
