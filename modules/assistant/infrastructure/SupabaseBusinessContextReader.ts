import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/db";
import type { BusinessContextReader } from "../application/ports";
import type { BusinessContext } from "../domain/BusinessContext";

/**
 * Adaptador temporal del contexto del negocio con service_role y tenant_id explícito.
 * Cuando modules/business exponga getBusinessContext(tenantId), basta con cambiar
 * este adaptador en la composición.
 */
export class SupabaseBusinessContextReader implements BusinessContextReader {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async getBusinessContext(tenantId: string): Promise<BusinessContext> {
    const [profile, hours, catalog, faqs, assistant, number] = await Promise.all([
      this.db
        .from("business_profiles")
        .select("legal_name,description,address,timezone,policies,contact_phone")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      this.db
        .from("business_hours")
        .select("weekday,opens,closes")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true }),
      this.db
        .from("catalog_items")
        .select("kind,name,description,price,currency,active")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("created_at", { ascending: true }),
      this.db
        .from("faqs")
        .select("question,answer")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true }),
      this.db
        .from("assistant_configs")
        .select("name,tone,language,greeting,escalation_message")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      this.db
        .from("whatsapp_numbers")
        .select("display_phone")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    for (const result of [profile, hours, catalog, faqs, assistant, number]) {
      if (result.error)
        throw new Error(`No se pudo leer el contexto del negocio: ${result.error.message}`);
    }

    return {
      name: profile.data?.legal_name ?? assistant.data?.name ?? "Negocio",
      description: profile.data?.description ?? null,
      address: profile.data?.address ?? null,
      timezone: profile.data?.timezone ?? "America/Mexico_City",
      policies: profile.data?.policies ?? null,
      contactPhone: profile.data?.contact_phone ?? number.data?.display_phone ?? null,
      hours: (hours.data ?? []).map((row) => ({
        weekday: row.weekday,
        opens: row.opens,
        closes: row.closes,
      })),
      catalog: (catalog.data ?? []).map((row) => ({
        kind: row.kind === "service" ? ("service" as const) : ("product" as const),
        name: row.name,
        description: row.description,
        price: row.price,
        currency: row.currency,
      })),
      faqs: (faqs.data ?? []).map((row) => ({ question: row.question, answer: row.answer })),
      assistant: {
        name: assistant.data?.name ?? "Asistente",
        tone: assistant.data?.tone ?? null,
        language: assistant.data?.language ?? "es-MX",
        greeting: assistant.data?.greeting ?? null,
        escalationMessage: assistant.data?.escalation_message ?? null,
      },
    };
  }
}
