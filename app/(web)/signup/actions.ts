"use server";

import { redirect } from "next/navigation";

import { createRegisterAccount } from "@/modules/auth/composition";
import { signInWithPassword, type RegisterAccountFieldErrors } from "@/modules/auth";

export type SignupState = {
  error: string | null;
  fieldErrors: RegisterAccountFieldErrors;
};

/** Acción del formulario de registro. La lógica de negocio vive en modules/auth. */
export async function signupAction(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const businessNameValue = formData.get("businessName");
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  const businessName = typeof businessNameValue === "string" ? businessNameValue : "";
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  const result = await createRegisterAccount().execute({ businessName, email, password });
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  const session = await signInWithPassword({ email, password });
  if (session.error) {
    return {
      error: "La cuenta se creó, pero no se pudo iniciar sesión. Entra desde Iniciar sesión.",
      fieldErrors: {},
    };
  }

  redirect("/home");
}
