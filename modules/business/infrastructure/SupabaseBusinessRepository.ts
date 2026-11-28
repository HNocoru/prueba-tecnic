import { toHourMinute } from "../domain/hours";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";
import type {
  BusinessRepository,
  BusinessProfileRow,
  AssistantConfigRow,
} from "../application/ports";
import type {
  AssistantConfigInput,
  BusinessHoursInput,
  BusinessProfileInput,
  CatalogItemInput,
  FaqInput,
} from "../application/validation";

export class SupabaseBusinessRepository implements BusinessRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async getProfile(tenantId: string): Promise<BusinessProfileRow> {
    const { data, error } = await this.db
      .from("business_profiles")
      .select("legal_name, description, address, timezone, policies, contact_phone")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer el perfil del negocio: ${error.message}`);
    if (!data) {
      return {
        legalName: null,
        description: null,
        address: null,
        timezone: "America/Mexico_City",
        policies: null,
        contactPhone: null,
      };
    }
    return {
      legalName: data.legal_name,
      description: data.description,
      address: data.address,
      timezone: data.timezone,
      policies: data.policies,
      contactPhone: data.contact_phone,
    };
  }

  async upsertProfile(tenantId: string, input: BusinessProfileInput): Promise<void> {
    const { error } = await this.db.from("business_profiles").upsert(
      {
        tenant_id: tenantId,
        legal_name: input.legalName,
        description: input.description,
        address: input.address,
        timezone: input.timezone,
        policies: input.policies,
        contact_phone: input.contactPhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(`No se pudo guardar el perfil del negocio: ${error.message}`);
  }

  async listHours(tenantId: string): Promise<{ weekday: number; opens: string; closes: string }[]> {
    const { data, error } = await this.db
      .from("business_hours")
      .select("weekday, opens, closes")
      .eq("tenant_id", tenantId)
      .order("weekday", { ascending: true });
    if (error) throw new Error(`No se pudieron leer los horarios: ${error.message}`);
    return (data ?? []).map((row) => ({
      weekday: row.weekday,
      opens: toHourMinute(row.opens),
      closes: toHourMinute(row.closes),
    }));
  }

  async replaceHours(tenantId: string, hours: BusinessHoursInput[]): Promise<void> {
    const { error: deleteError } = await this.db
      .from("business_hours")
      .delete()
      .eq("tenant_id", tenantId);
    if (deleteError)
      throw new Error(`No se pudieron actualizar los horarios: ${deleteError.message}`);
    if (hours.length === 0) return;
    const rows = hours.map((h) => ({
      tenant_id: tenantId,
      weekday: h.weekday,
      opens: h.opens,
      closes: h.closes,
    }));
    const { error } = await this.db.from("business_hours").insert(rows);
    if (error) throw new Error(`No se pudieron guardar los horarios: ${error.message}`);
  }

  async listCatalogItems(tenantId: string): Promise<
    {
      id: string;
      kind: "product" | "service";
      name: string;
      description: string | null;
      price: number | null;
      currency: string;
      active: boolean;
    }[]
  > {
    const { data, error } = await this.db
      .from("catalog_items")
      .select("id, kind, name, description, price, currency, active")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind as "product" | "service",
      name: row.name,
      description: row.description,
      price: row.price,
      currency: row.currency,
      active: row.active,
    }));
  }

  async replaceCatalogItems(tenantId: string, items: CatalogItemInput[]): Promise<void> {
    const { error: deleteError } = await this.db
      .from("catalog_items")
      .delete()
      .eq("tenant_id", tenantId);
    if (deleteError) throw new Error(`No se pudo actualizar el catálogo: ${deleteError.message}`);
    if (items.length === 0) return;
    const rows = items.map((item) => ({
      tenant_id: tenantId,
      kind: item.kind,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      active: item.active,
    }));
    const { error } = await this.db.from("catalog_items").insert(rows);
    if (error) throw new Error(`No se pudo guardar el catálogo: ${error.message}`);
  }

  async listFaqs(
    tenantId: string,
  ): Promise<{ id: string; question: string; answer: string; position: number }[]> {
    const { data, error } = await this.db
      .from("faqs")
      .select("id, question, answer, position")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });
    if (error) throw new Error(`No se pudieron leer las preguntas frecuentes: ${error.message}`);
    return data ?? [];
  }

  async replaceFaqs(tenantId: string, faqs: FaqInput[]): Promise<void> {
    const { error: deleteError } = await this.db.from("faqs").delete().eq("tenant_id", tenantId);
    if (deleteError) throw new Error(`No se pudieron actualizar las FAQs: ${deleteError.message}`);
    if (faqs.length === 0) return;
    const rows = faqs.map((f, idx) => ({
      tenant_id: tenantId,
      question: f.question,
      answer: f.answer,
      position: f.position ?? idx,
    }));
    const { error } = await this.db.from("faqs").insert(rows);
    if (error) throw new Error(`No se pudieron guardar las FAQs: ${error.message}`);
  }

  async getAssistantConfig(tenantId: string): Promise<AssistantConfigRow> {
    const { data, error } = await this.db
      .from("assistant_configs")
      .select("name, tone, voice, language, greeting, escalation_message")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la configuración del asistente: ${error.message}`);
    if (!data) {
      return {
        name: "Asistente",
        tone: null,
        voice: "roberto",
        language: "es-MX",
        greeting: null,
        escalationMessage: null,
      };
    }
    const voice = data.voice === "eduardo" ? "eduardo" : "roberto";
    return {
      name: data.name,
      tone: data.tone,
      voice,
      language: data.language,
      greeting: data.greeting,
      escalationMessage: data.escalation_message,
    };
  }

  async upsertAssistantConfig(tenantId: string, input: AssistantConfigInput): Promise<void> {
    const { error } = await this.db.from("assistant_configs").upsert(
      {
        tenant_id: tenantId,
        name: input.name,
        tone: input.tone,
        voice: input.voice,
        language: input.language,
        greeting: input.greeting,
        escalation_message: input.escalationMessage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error)
      throw new Error(`No se pudo guardar la configuración del asistente: ${error.message}`);
  }
}
