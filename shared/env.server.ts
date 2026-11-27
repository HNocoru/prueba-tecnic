import "server-only";

import { z } from "zod";

import { clientEnv } from "./env.client";

/**
 * Esquema de las variables de entorno exclusivas del servidor (secretos).
 * Nunca deben llevar prefijo NEXT_PUBLIC_.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  /** Secreto compartido con el worker de voz para /api/internal/*. */
  WORKER_API_TOKEN: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  /** Opcionales: sin ellos el asistente registra el fallo y no rompe el webhook. */
  GROQ_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).optional(),
  /**
   * WhatsApp Connector de LiveKit Cloud. Opcionales para que el build y los entornos sin
   * llamadas de voz arranquen; si faltan, un `connect` falla con un error claro (ver
   * modules/calls/composition.ts) en lugar de romper la app entera.
   */
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
});

/**
 * Valida las variables del servidor contra `process.env` al importar el módulo.
 * Lanza un error que nombra la variable faltante o inválida, sin imprimir valores.
 */
function parseServerEnv(): z.infer<typeof serverSchema> {
  const result = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WORKER_API_TOKEN: process.env.WORKER_API_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
    LIVEKIT_URL: process.env.LIVEKIT_URL || undefined,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || undefined,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || undefined,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });

  if (!result.success) {
    const names = result.error.issues
      .map((issue) => (issue.path.length > 0 ? issue.path.join(".") : "unknown"))
      .join(", ");
    throw new Error(`Faltan o son inválidas las variables de entorno del servidor: ${names}`);
  }

  return result.data;
}

export { serverSchema };
export const serverEnv = parseServerEnv();
export const env = { ...clientEnv, ...serverEnv };
export type ServerEnv = z.infer<typeof serverSchema>;
export type Env = typeof env;
