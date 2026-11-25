-- Slice 00 / T0.3: tenancy (opción A: auth.uid() + tenant_members) y contactos.

-- Detecta secretos en un jsonb (llaves tipo password/token/api key o valores tipo bearer/JWT/URL con credenciales).
CREATE FUNCTION public.jsonb_has_secrets(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $fn$
    SELECT jsonb_path_exists(p,
             'strict $.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "^(.*[_-])?(secret|password|passwd|pwd|api[_-]?key|apikey|private[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|bearer[_-]?token|token|authorization|credentials?)$" flag "i")',
             '{}', true)
        OR jsonb_path_exists(p,
             'strict $.** ? (@.type() == "string" && (@ like_regex "^(bearer|basic) " flag "i" || @ like_regex "^sk-[a-z0-9_-]{16,}$" flag "i" || @ like_regex "^eyj[a-z0-9_-]+[.][a-z0-9_-]+[.][a-z0-9_-]+$" flag "i" || @ like_regex "://[^/:@ ]+:[^/@ ]+@"))',
             '{}', true)
$fn$;

-- [módulo tenancy] ---------------------------------------------------------
CREATE TABLE public.tenants (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       text NOT NULL UNIQUE,
    name       text NOT NULL,
    status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    settings   jsonb NOT NULL DEFAULT '{}' CHECK (NOT public.jsonb_has_secrets(settings)),  -- sin secretos
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_members (
    tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    user_id   uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role      text NOT NULL DEFAULT 'operator',
    PRIMARY KEY (tenant_id, user_id)
);
-- La RLS busca por user_id; la PK solo cubre tenant_id como prefijo.
CREATE INDEX ix_tenant_members_user_id ON public.tenant_members (user_id);

-- Ids de los tenants a los que pertenece el usuario autenticado. SECURITY DEFINER para
-- leer tenant_members sin recursión de RLS; search_path fijo.
CREATE FUNCTION public.current_tenant() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT tenant_id FROM public.tenant_members WHERE user_id = (SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION public.current_tenant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant() TO authenticated;

-- [módulo contacts] --------------------------------------------------------
CREATE TABLE public.contacts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES public.tenants (id),
    wa_id       text NOT NULL,                       -- identificador de WhatsApp
    phone_e164  text CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),  -- aparte de wa_id; se normaliza en la app
    name        text,                                -- PII
    attributes  jsonb NOT NULL DEFAULT '{}',         -- PII
    created_at  timestamptz NOT NULL DEFAULT now(),
    redacted_at timestamptz,
    UNIQUE (tenant_id, wa_id),
    UNIQUE (tenant_id, id)                           -- destino de FKs compuestas
);

-- Una vez anonimizado (redacted_at) no se recupera; al anonimizar, name NULL y attributes {}.
CREATE FUNCTION public.guard_contacts() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'contacts %: tenant_id es inmutable', OLD.id;
    END IF;
    IF OLD.redacted_at IS NOT NULL
       AND (NEW.redacted_at IS DISTINCT FROM OLD.redacted_at OR NEW.name IS DISTINCT FROM OLD.name
            OR NEW.attributes IS DISTINCT FROM OLD.attributes) THEN
        RAISE EXCEPTION 'contacts % ya esta anonimizado', OLD.id;
    END IF;
    IF OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL
       AND (NEW.name IS NOT NULL OR NEW.attributes <> '{}'::jsonb) THEN
        RAISE EXCEPTION 'contacts %: al marcar redacted_at, name debe quedar NULL y attributes en {}', OLD.id;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_contacts_guard BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.guard_contacts();

-- RLS ------------------------------------------------------------------------
-- Sin acceso para anon; authenticated solo lo permitido por policy. service_role (BYPASSRLS)
-- filtra por tenant_id explícito en el servidor.
REVOKE ALL ON public.tenants, public.tenant_members, public.contacts FROM anon;
REVOKE ALL ON public.tenants, public.tenant_members, public.contacts FROM authenticated;
GRANT SELECT ON public.tenants, public.tenant_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;

ALTER TABLE public.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants        FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts       FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
    USING (id IN (SELECT public.current_tenant()));
CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()));
CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()));
CREATE POLICY contacts_insert ON public.contacts FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT public.current_tenant()));
CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()))
    WITH CHECK (tenant_id IN (SELECT public.current_tenant()));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()));
