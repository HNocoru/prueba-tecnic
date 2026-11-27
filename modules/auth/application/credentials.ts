import { z } from "zod";

/**
 * Validador estricto de email:
 * - trim
 * - formato válido con @ y dominio no vacío
 * - longitud máxima razonable (254 según RFC 5321)
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es requerido")
  .max(254, "El email es demasiado largo")
  .email("Formato de email inválido");

/**
 * En el login solo se exige contraseña no vacía:
 * exigir complejidad al entrar bloquearía a usuarios existentes.
 */
export const loginPasswordSchema = z.string().min(1, "La contraseña no puede estar vacía");

/**
 * En alta y cambio de contraseña se exige fuerza:
 * Mínimo 12 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo.
 */
export const strongPasswordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial (símbolo)");

/** Credenciales aceptadas por el formulario de login. */
export const credentialsSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type Credentials = z.infer<typeof credentialsSchema>;

/** Errores por campo del login, con los mensajes de zod ya en español. */
export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

/**
 * Envuelve `credentialsSchema` para mostrar un mensaje por campo inválido.
 * No añade reglas: solo toma el primer error de cada campo.
 */
export function loginFieldErrors(input: { email: unknown; password: unknown }): LoginFieldErrors {
  const result = credentialsSchema.safeParse(input);
  if (result.success) {
    return {};
  }

  const { email, password } = result.error.flatten().fieldErrors;
  const errors: LoginFieldErrors = {};

  if (email?.length) {
    errors.email = email[0];
  }
  if (password?.length) {
    errors.password = password[0];
  }

  return errors;
}
