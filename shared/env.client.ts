import { z } from "zod";

/**
 * Esquema de las variables de entorno disponibles en el cliente.
 * Solo pueden incluir variables con prefijo NEXT_PUBLIC_ (nunca secretos).
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/**
 * Valida las variables del cliente contra `process.env` al importar el módulo.
 * Lanza un error que nombra la variable faltante o inválida, sin imprimir valores.
 */
function parseClientEnv(): z.infer<typeof clientSchema> {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const names = result.error.issues
      .map((issue) => (issue.path.length > 0 ? issue.path.join(".") : "unknown"))
      .join(", ");
    throw new Error(`Faltan o son inválidas las variables de entorno del cliente: ${names}`);
  }

  return result.data;
}

export { clientSchema };
export const clientEnv = parseClientEnv();
export type ClientEnv = z.infer<typeof clientSchema>;
