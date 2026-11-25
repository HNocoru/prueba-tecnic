"use server";

import { redirect } from "next/navigation";

import { credentialsSchema, signInWithPassword } from "@/modules/auth";

export type LoginState = { error: string | null };

/** Acción del formulario de login. La lógica de Supabase vive en modules/auth. */
export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Introduce un email y una contraseña válidos." };
  }

  const result = await signInWithPassword(parsed.data);

  if (result.error) {
    return { error: result.error };
  }

  redirect("/contacts");
}
