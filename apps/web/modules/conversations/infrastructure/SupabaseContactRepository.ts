import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@app/db";
import { Contact } from "../domain/Contact";
import type { ContactRepository } from "../application/ContactRepository";
import { clientEnv } from "@/lib/env.client";

type ContactRow = Tables<"contacts">;

/**
 * Adaptador de Supabase para el repositorio de contactos.
 * Usa el cliente con la sesion del usuario (JWT via cookies de Supabase Auth),
 * nunca la service role, para que la RLS limite por tenant.
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

/**
 * Crea el cliente de Supabase con la sesion del usuario (cookies) y arma el adaptador.
 * Debe ejecutarse en un contexto de servidor por request.
 */
export function createSupabaseContactRepository(): SupabaseContactRepository {
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => {
        const cookieStore = await cookies();
        return cookieStore.getAll();
      },
    },
  });

  return new SupabaseContactRepository(supabase);
}
