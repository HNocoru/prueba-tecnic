-- Slice dashboard / F2: perfiles, negocio, asistente, WhatsApp, conversaciones, llamadas y solicitudes.

-- [módulo auth] perfil de cuenta (por usuario, no por tenant) ----------------
CREATE TABLE public.profiles (
    user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name   text,                                           -- PII
    phone       text,                                           -- PII
    age         int CHECK (age > 0 AND age < 130),
    avatar_path text,                                           -- ruta en Storage
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- [módulo business] ----------------------------------------------------------
CREATE TABLE public.business_profiles (
    tenant_id     uuid PRIMARY KEY REFERENCES public.tenants (id),
    legal_name    text,
    description   text,
    address       text,
    timezone      text NOT NULL DEFAULT 'America/Mexico_City',
    policies      text,
    contact_phone text,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_hours (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants (id),
    weekday   int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    opens     time NOT NULL,
    closes    time NOT NULL,
    CHECK (opens < closes),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_business_hours_tenant_weekday ON public.business_hours (tenant_id, weekday);

CREATE TABLE public.catalog_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES public.tenants (id),
    kind        text NOT NULL CHECK (kind IN ('product', 'service')),
    name        text NOT NULL,
    description text,
    price       numeric(12,2) CHECK (price >= 0),
    currency    text NOT NULL DEFAULT 'MXN',
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_catalog_items_tenant ON public.catalog_items (tenant_id, created_at);

CREATE TABLE public.faqs (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants (id),
    question  text NOT NULL,
    answer    text NOT NULL,
    position  int NOT NULL DEFAULT 0,
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_faqs_tenant_position ON public.faqs (tenant_id, position);

-- [módulo assistant] ---------------------------------------------------------
CREATE TABLE public.assistant_configs (
    tenant_id          uuid PRIMARY KEY REFERENCES public.tenants (id),
    name               text NOT NULL DEFAULT 'Asistente',
    tone               text,
    voice              text,
    language           text NOT NULL DEFAULT 'es-MX',
    greeting           text,
    escalation_message text,
    mascot             jsonb NOT NULL DEFAULT '{}' CHECK (NOT public.jsonb_has_secrets(mascot)),  -- sin secretos
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- [módulo whatsapp] un número por negocio por ahora ---------------------------
CREATE TABLE public.whatsapp_numbers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id),
    phone_number_id text NOT NULL UNIQUE,
    display_phone   text,
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id),
    UNIQUE (tenant_id, id)
);

-- [módulo conversations] -----------------------------------------------------
CREATE TABLE public.conversations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES public.tenants (id),
    contact_id       uuid NOT NULL,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, contact_id) REFERENCES public.contacts (tenant_id, id),
    UNIQUE (tenant_id, contact_id),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_conversations_tenant_activity ON public.conversations (tenant_id, last_activity_at DESC);

CREATE TABLE public.messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id),
    conversation_id uuid NOT NULL,
    direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    kind            text NOT NULL CHECK (kind IN ('text', 'audio', 'image', 'document')),
    body            text,                                       -- PII
    media_path      text,
    transcript      text,                                       -- PII
    wamid           text UNIQUE,                                -- idempotencia del webhook
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, conversation_id) REFERENCES public.conversations (tenant_id, id),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_messages_conversation_occurred ON public.messages (conversation_id, occurred_at DESC);

CREATE TABLE public.calls (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES public.tenants (id),
    conversation_id  uuid NOT NULL,
    wa_call_id       text UNIQUE,
    started_at       timestamptz NOT NULL DEFAULT now(),
    ended_at         timestamptz,
    duration_seconds int CHECK (duration_seconds >= 0),
    outcome          text CHECK (outcome IN ('completed', 'caller_hangup', 'time_limit', 'failed', 'missed')),
    summary          text,                                      -- PII
    FOREIGN KEY (tenant_id, conversation_id) REFERENCES public.conversations (tenant_id, id),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_calls_conversation_started ON public.calls (conversation_id, started_at DESC);

CREATE TABLE public.call_turns (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants (id),
    call_id   uuid NOT NULL,
    role      text NOT NULL CHECK (role IN ('user', 'assistant')),
    text      text NOT NULL,                                    -- PII
    position  int NOT NULL,
    FOREIGN KEY (tenant_id, call_id) REFERENCES public.calls (tenant_id, id),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_call_turns_call_position ON public.call_turns (call_id, position);

CREATE TABLE public.requests (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES public.tenants (id),
    contact_id uuid NOT NULL,
    title      text NOT NULL,
    status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('none', 'pending', 'in_progress', 'completed', 'cancelled')),
    amount     numeric(12,2) CHECK (amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, contact_id) REFERENCES public.contacts (tenant_id, id),
    UNIQUE (tenant_id, id)
);
CREATE INDEX ix_requests_tenant_created ON public.requests (tenant_id, created_at);
CREATE INDEX ix_requests_contact ON public.requests (tenant_id, contact_id);

-- RLS ------------------------------------------------------------------------
REVOKE ALL ON public.profiles, public.business_profiles, public.business_hours, public.catalog_items, public.faqs,
    public.assistant_configs, public.whatsapp_numbers, public.conversations, public.messages, public.calls,
    public.call_turns, public.requests FROM anon;
REVOKE ALL ON public.profiles, public.business_profiles, public.business_hours, public.catalog_items, public.faqs,
    public.assistant_configs, public.whatsapp_numbers, public.conversations, public.messages, public.calls,
    public.call_turns, public.requests FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles, public.business_hours, public.catalog_items,
    public.faqs, public.assistant_configs, public.conversations, public.messages, public.calls, public.call_turns,
    public.requests TO authenticated;
GRANT SELECT ON public.whatsapp_numbers TO authenticated;  -- lo gestiona el servidor (service_role)

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.business_hours    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours    FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.faqs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs              FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.assistant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_configs FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers  FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls             FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.call_turns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_turns        FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests          FORCE  ROW LEVEL SECURITY;

-- profiles: solo la fila propia
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Tablas por tenant
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['business_profiles','business_hours','catalog_items','faqs','assistant_configs',
                             'conversations','messages','calls','call_turns','requests'] LOOP
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.current_tenant()))', t || '_select', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.current_tenant()))', t || '_insert', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.current_tenant())) WITH CHECK (tenant_id IN (SELECT public.current_tenant()))', t || '_update', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.current_tenant()))', t || '_delete', t);
    END LOOP;
END $$;
CREATE POLICY whatsapp_numbers_select ON public.whatsapp_numbers FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT public.current_tenant()));
