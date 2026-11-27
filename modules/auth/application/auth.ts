import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/shared/supabase/server";

import { credentialsSchema, type Credentials } from "./credentials";
import { getRequireUserRedirect } from "../domain/require-user-redirect";
import { getVerifiedUserId } from "./verified-user";

export { credentialsSchema };
export type { Credentials };

export type AuthResult = { error: string | null };

/**
 * Inicia sesión con email y contraseña. Devuelve un mensaje genérico para no
 * revelar si el email existe.
 */
export async function signInWithPassword(credentials: Credentials): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      return { error: "Email o contraseña incorrectos." };
    }

    return { error: null };
  } catch {
    return { error: "No se pudo iniciar sesión. Inténtalo de nuevo." };
  }
}

/** Cierra la sesión actual y elimina las cookies de Supabase. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Comprueba si el proxy ya verificó la sesión y redirige a /login si no.
 * La verificación de red ocurre una sola vez por petición, en el proxy.
 */
export async function requireUser(): Promise<void> {
  const userId = await getVerifiedUserId();
  const target = getRequireUserRedirect(Boolean(userId));

  if (target) {
    redirect(target);
  }
}
