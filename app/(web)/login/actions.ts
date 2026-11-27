"use server";

import { redirect } from "next/navigation";

import {
  credentialsSchema,
  loginFieldErrors,
  signInWithPassword,
  type LoginFieldErrors,
} from "@/modules/auth";

export type LoginState = {
  error: string | null;
  fieldErrors: LoginFieldErrors;
};

/** Acción del formulario de login. La lógica de Supabase vive en modules/auth. */
export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Normaliza a texto: un campo ausente no debe escapar como mensaje de zod en inglés.
  const email = formData.get("email");
  const password = formData.get("password");
  const input = {
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
  };

  const fieldErrors = loginFieldErrors(input);
  if (Object.keys(fieldErrors).length > 0) {
    // Sin credenciales válidas no se consulta Supabase ni se redirige.
    return { error: null, fieldErrors };
  }

  // `loginFieldErrors` ya validó con este mismo esquema; parse solo estrecha el tipo.
  const credentials = credentialsSchema.parse(input);
  const result = await signInWithPassword(credentials);

  if (result.error) {
    return { error: result.error, fieldErrors: {} };
  }

  redirect("/home");
}
