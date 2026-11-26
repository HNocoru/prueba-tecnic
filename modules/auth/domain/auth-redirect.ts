const LOGIN_PATH = "/login";
// La página principal del dashboard es /home.
const HOME_PATH = "/home";

/** Normaliza la ruta para que "/login/" y "/login" se traten igual. */
function normalizePathname(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Rutas que se pueden visitar sin sesión. */
function isPublicPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

/**
 * Decide si una petición debe redirigirse.
 * Devuelve la ruta destino o null si debe continuar.
 */
export function getAuthRedirect(pathname: string, hasSession: boolean): string | null {
  const path = normalizePathname(pathname);

  if (!hasSession && !isPublicPath(path)) {
    return LOGIN_PATH;
  }

  if (hasSession && path === LOGIN_PATH) {
    return HOME_PATH;
  }

  return null;
}
