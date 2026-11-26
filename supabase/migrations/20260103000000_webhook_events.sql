-- Slice 01 / webhook: bitácora idempotente de eventos entrantes de proveedores (WhatsApp).
-- [módulo channels/whatsapp] Solo la escribe el servidor (service_role); ningún rol de la app tiene acceso.
CREATE TABLE public.webhook_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid REFERENCES public.tenants (id),   -- NULL: evento sin tenant resuelto
    provider     text NOT NULL,
    event_id     text NOT NULL,                         -- wamid o hash del cuerpo
    payload      jsonb NOT NULL,                        -- PII
    received_at  timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    error        text,
    UNIQUE (provider, event_id)
);
CREATE INDEX ix_webhook_events_tenant ON public.webhook_events (tenant_id, received_at);

REVOKE ALL ON public.webhook_events FROM anon;
REVOKE ALL ON public.webhook_events FROM authenticated;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE  ROW LEVEL SECURITY;
-- Sin policies: anon y authenticated no ven ni escriben nada.
