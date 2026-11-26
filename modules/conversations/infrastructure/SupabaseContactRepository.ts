import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/shared/db";
import { Contact } from "../domain/Contact";
import type { ContactRepository } from "../application/ContactRepository";

type ContactRow = Tables<"contacts">;

/**
 * Adaptador de Supabase para el repositorio de contactos.
 * Recibe el cliente ya construido (con la sesion del usuario, nunca la service role)
 * para que la RLS limite por tenant.
 */
export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listContacts(tenantId: string): Promise<Contact[]> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select("*")
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`No se pudieron listar los contactos del tenant ${tenantId}`);
    }

    return (data ?? []).map((row) => this.toDomain(row));
  }

  private toDomain(row: ContactRow): Contact {
    return new Contact({
      id: row.id,
      tenantId: row.tenant_id,
      waId: row.wa_id,
      phoneE164: row.phone_e164,
      name: row.name,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      redactedAt: row.redacted_at,
    });
  }
}
