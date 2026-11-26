import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/shared/db";

import type { ContactStore, EventStore, MessageInput, TenantResolver } from "../application/ports";

const PROVIDER = "whatsapp";

/**
 * Adaptador de Supabase con service_role (se salta la RLS): por eso cada consulta
 * lleva tenant_id explícito y ninguna lo toma de la entrada sin resolverlo antes.
 */
export class SupabaseChannelStore implements EventStore, TenantResolver, ContactStore {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async saveEvent(eventId: string, payload: unknown): Promise<{ alreadyProcessed: boolean }> {
    const { error } = await this.db.from("webhook_events").upsert(
      {
        provider: PROVIDER,
        event_id: eventId,
        payload: JSON.parse(JSON.stringify(payload)) as NonNullable<Json>,
      },
      { onConflict: "provider,event_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`No se pudo guardar el evento: ${error.message}`);

    const { data, error: readError } = await this.db
      .from("webhook_events")
      .select("processed_at")
      .eq("provider", PROVIDER)
      .eq("event_id", eventId)
      .single();
    if (readError) throw new Error(`No se pudo leer el evento: ${readError.message}`);
    return { alreadyProcessed: data.processed_at !== null };
  }

  async markProcessed(eventId: string, tenantId: string | null): Promise<void> {
    const { error } = await this.db
      .from("webhook_events")
      .update({ tenant_id: tenantId, processed_at: new Date().toISOString(), error: null })
      .eq("provider", PROVIDER)
      .eq("event_id", eventId);
    if (error) throw new Error(`No se pudo marcar el evento: ${error.message}`);
  }

  async markFailed(eventId: string, tenantId: string | null, message: string): Promise<void> {
    const { error } = await this.db
      .from("webhook_events")
      .update({ tenant_id: tenantId, error: message })
      .eq("provider", PROVIDER)
      .eq("event_id", eventId);
    if (error) throw new Error(`No se pudo marcar el evento: ${error.message}`);
  }

  async findTenantIdByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("whatsapp_numbers")
      .select("tenant_id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo resolver el tenant: ${error.message}`);
    return data?.tenant_id ?? null;
  }

  async upsertContact(
    tenantId: string,
    contact: { waId: string; phoneE164: string | null; name: string | null },
  ): Promise<string> {
    // Solo se envían los campos con valor para no pisar datos existentes con null.
    const row: Database["public"]["Tables"]["contacts"]["Insert"] = {
      tenant_id: tenantId,
      wa_id: contact.waId,
    };
    if (contact.phoneE164) row.phone_e164 = contact.phoneE164;
    if (contact.name) row.name = contact.name;

    const { data, error } = await this.db
      .from("contacts")
      .upsert(row, { onConflict: "tenant_id,wa_id" })
      .select("id")
      .single();
    if (error) throw new Error(`No se pudo guardar el contacto: ${error.message}`);
    return data.id;
  }

  async upsertConversation(
    tenantId: string,
    contactId: string,
    lastActivityAt: Date,
  ): Promise<string> {
    const { data, error } = await this.db
      .from("conversations")
      .upsert(
        {
          tenant_id: tenantId,
          contact_id: contactId,
          last_activity_at: lastActivityAt.toISOString(),
        },
        { onConflict: "tenant_id,contact_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`No se pudo guardar la conversación: ${error.message}`);
    return data.id;
  }

  async insertMessageIfNew(
    tenantId: string,
    conversationId: string,
    m: MessageInput,
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from("messages")
      .upsert(
        {
          tenant_id: tenantId,
          conversation_id: conversationId,
          direction: m.direction,
          kind: m.kind,
          body: m.body,
          wamid: m.wamid,
          occurred_at: m.occurredAt.toISOString(),
        },
        { onConflict: "wamid", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error(`No se pudo guardar el mensaje: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
}
