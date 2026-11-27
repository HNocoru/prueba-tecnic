import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/shared/db";
import { Contact } from "../domain/Contact";
import type { ContactRepository } from "../application/ContactRepository";
import type { CursorPageOptions, CursorPageResult, PageCursor } from "../application/pagination";

type ContactRow = Tables<"contacts">;

/** Filtro keyset de PostgREST para orden descendente por (created_at, id). */
function afterFilter(cursor: PageCursor): string {
  return `created_at.lt."${cursor.at}",and(created_at.eq."${cursor.at}",id.lt."${cursor.id}")`;
}

/**
 * Adaptador de Supabase para el repositorio de contactos.
 * Recibe el cliente ya construido (con la sesion del usuario, nunca la service role)
 * para que la RLS limite por tenant.
 */
export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listContacts(
    tenantId: string,
    options: CursorPageOptions,
  ): Promise<CursorPageResult<Contact>> {
    let query = this.supabase.from("contacts").select("*").eq("tenant_id", tenantId);

    if (options.after) {
      query = query.or(afterFilter(options.after));
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit + 1);

    if (error) {
      throw new Error(`No se pudieron listar los contactos del tenant ${tenantId}`);
    }

    const rows = data ?? [];
    return {
      items: rows.slice(0, options.limit).map((row) => this.toDomain(row)),
      hasMore: rows.length > options.limit,
    };
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
