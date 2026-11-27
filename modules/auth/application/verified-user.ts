import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { VERIFIED_USER_HEADER } from "../domain/verified-user";

/**
 * Identidad ya verificada por el proxy en esta petición.
 * React cache() la comparte entre layout, páginas y acciones del mismo request.
 * La autorización real de los datos sigue siendo la RLS con el JWT de la sesión.
 */
export const getVerifiedUserId = cache(async (): Promise<string | null> => {
  const store = await headers();
  return store.get(VERIFIED_USER_HEADER);
});
