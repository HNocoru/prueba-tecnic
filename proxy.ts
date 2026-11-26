import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createProxyClient, getAuthRedirect } from "@/modules/auth";

/** Cabeceras de caché que Supabase exige cuando escribe cookies de sesión. */
const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"];

/**
 * Refresca la sesión de Supabase y aplica la decisión pura de redirección.
 * Es una comprobación optimista; las páginas y acciones siguen validando la sesión.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { supabase, getResponse } = createProxyClient(request);
  const { data } = await supabase.auth.getUser();
  const redirectTo = getAuthRedirect(request.nextUrl.pathname, Boolean(data.user));
  const response = getResponse();

  if (!redirectTo) {
    return response;
  }

  const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));

  // Conserva las cookies refrescadas y las cabeceras anticaché al redirigir.
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  AUTH_CACHE_HEADERS.forEach((name) => {
    const value = response.headers.get(name);
    if (value) {
      redirectResponse.headers.set(name, value);
    }
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
