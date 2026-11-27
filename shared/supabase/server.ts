import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { clientEnv } from "@/shared/env.client";

/**
 * Crea un cliente de Supabase para el servidor usando la sesión del usuario
 * (cookies) y la anon key. Nunca usa la service role.
 * Debe crearse uno nuevo por request.
 *
 * createServerClient registra onAuthStateChange: con una sesión real en cookies,
 * cargarla lee expires_at con Date.now(). connection() excluye esa lectura del
 * prerender; la frontera Suspense del layout del dashboard muestra su fallback
 * mientras llega la petición.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Un Server Component no puede escribir cookies; el proxy ya refresca la sesión.
          }
        },
      },
    },
  );
}
