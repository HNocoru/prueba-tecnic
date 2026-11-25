import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@app/db";

import { clientEnv } from "@/shared/env.client";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Devuelve un cliente de Supabase para el navegador.
 * Usa solo la anon key y mantiene la sesión en cookies para que el servidor la lea.
 */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  return browserClient;
}
