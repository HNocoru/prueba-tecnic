-- S19: memoria por contacto, alimentada al cerrar una llamada.

CREATE TABLE public.contact_memory (
    tenant_id  uuid NOT NULL REFERENCES public.tenants (id),
    contact_id uuid NOT NULL,
    summary    text NOT NULL DEFAULT '',
    facts      jsonb NOT NULL DEFAULT '{}' CHECK (NOT public.jsonb_has_secrets(facts)),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, contact_id),
    FOREIGN KEY (tenant_id, contact_id)
        REFERENCES public.contacts (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX ix_contact_memory_updated_at ON public.contact_memory (tenant_id, updated_at DESC);

-- Lectura para el usuario autenticado solo dentro de su tenant; escritura exclusiva del servidor
-- (service_role), que filtra por tenant_id explícito como en el resto del esquema.
REVOKE ALL ON public.contact_memory FROM anon;
REVOKE ALL ON public.contact_memory FROM authenticated;
GRANT SELECT ON public.contact_memory TO authenticated;

ALTER TABLE public.contact_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_memory FORCE  ROW LEVEL SECURITY;

CREATE POLICY contact_memory_select ON public.contact_memory FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()));
