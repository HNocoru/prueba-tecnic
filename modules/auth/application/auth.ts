import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/shared/supabase/server";

import { getRequireUserRedirect } from "../domain/require-user-redirect";

/** Credenciales aceptadas por el formulario de login. */
export const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type Credentials = z.infer<typeof credentialsSchema>;

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
 * Comprueba en el servidor (getUser valida el token con Supabase) si hay usuario
 * y redirige a /login si no. Defensa en profundidad además del proxy.
 */
export async function requireUser(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const target = getRequireUserRedirect(Boolean(data.user));

  if (target) {
    redirect(target);
  }
}
