import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { VERIFIED_USER_HEADER, createProxyClient, getAuthRedirect } from "@/modules/auth";

/** Cabeceras de caché que Supabase exige cuando escribe cookies de sesión. */
const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"];

/** Copia cookies y cabeceras anticaché de la respuesta de Supabase a otra respuesta. */
function copyAuthState(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  AUTH_CACHE_HEADERS.forEach((name) => {
    const value = from.headers.get(name);
    if (value) {
      to.headers.set(name, value);
    }
  });
  return to;
}

/**
 * Refresca la sesión de Supabase, aplica la decisión pura de redirección y deja el
 * id ya verificado en una cabecera interna. Es la ÚNICA verificación de red por
 * petición; las páginas leen esa cabecera y la RLS sigue siendo la defensa de datos.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { supabase, getResponse } = createProxyClient(request);
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const redirectTo = getAuthRedirect(request.nextUrl.pathname, Boolean(userId));
  const authResponse = getResponse();

  if (redirectTo) {
    return copyAuthState(authResponse, NextResponse.redirect(new URL(redirectTo, request.url)));
  }

  // Sobrescribe cualquier cabecera del cliente para que no pueda suplantar al usuario.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_USER_HEADER);
  if (userId) {
    requestHeaders.set(VERIFIED_USER_HEADER, userId);
  }

  return copyAuthState(authResponse, NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
