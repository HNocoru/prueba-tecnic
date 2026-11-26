import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { clientEnv } from "@/shared/env.client";

export type ProxySupabaseClient = {
  supabase: SupabaseClient<Database>;
  /** Devuelve la respuesta con las cookies que Supabase haya refrescado. */
  getResponse: () => NextResponse;
};

/**
 * Crea el cliente de Supabase para el proxy. Recolecta las cookies actualizadas
 * en una respuesta que se debe devolver al final de la petición.
 */
export function createProxyClient(request: NextRequest): ProxySupabaseClient {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Propaga las cookies al request para que los Server Components las lean.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          // Evita que un CDN cachee respuestas con cookies de sesión.
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  return { supabase, getResponse: () => response };
}
