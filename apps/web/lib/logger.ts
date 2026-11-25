import "server-only";

import pino from "pino";

/**
 * Logger mínimo con pino. El nivel se toma de LOG_LEVEL (por defecto "info").
 * Nunca registra secretos ni cuerpos de request: solo metadatos seguros.
 */
const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({ level });
