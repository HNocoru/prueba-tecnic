import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";

import { clientEnv } from "@/shared/env.client";
import { serverEnv } from "@/shared/env.server";

/**
 * Cliente de Supabase con service_role: se salta la RLS. Solo para trabajo del servidor
 * sin sesión de usuario (webhooks). Cada consulta debe llevar tenant_id explícito.
 * Nunca debe llegar al cliente ni devolverse en una respuesta.
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    serverEnv.SUPABASE_URL ?? clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
