import { normalizePhone } from "@/modules/assistant";
import { logger } from "@/shared/logger";
import { z } from "zod";

import type { WhatsAppNumberLookup, WhatsAppNumberStore } from "./ports";

const INVALID_FORMAT = "Escribe el número con código de país, por ejemplo +52 55 1234 5678.";

/**
 * Acepta espacios, guiones y paréntesis: el usuario escribe el número tal como lo ve.
 * Sin '+', solo se normaliza si ya trae código de país (11 a 15 dígitos), para no
 * interpretar un número local como E.164.
 */
const displayPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const compact = value.replace(/[\s\-().]/g, "");
    if (compact.startsWith("+") || !/^\d{11,15}$/.test(compact)) return compact;
    return `+${compact}`;
  },
  z.string().regex(/^\+[1-9]\d{7,14}$/, INVALID_FORMAT),
);

export const connectInputSchema = z.object({ displayPhone: displayPhoneSchema });

export type ConnectResult = { ok: true } | { ok: false; error: string };

/** Texto para la persona: la causa técnica se registra en el servidor, nunca se devuelve. */
const ERRORS = {
  unavailable: "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
  notRegistered:
    "No encontramos ese número como cuenta de WhatsApp Business. Revisa que esté registrado e inténtalo de nuevo.",
  taken: "Ese número ya está conectado a otro negocio.",
} as const;

/**
 * Caso de uso: liga el número visible que escribe el cliente con el id de la cuenta
 * de la plataforma y lo guarda como pendiente. El tenant siempre llega de la sesión.
 */
export class ConnectWhatsAppNumber {
  constructor(
    private readonly store: WhatsAppNumberStore,
    private readonly lookup: WhatsAppNumberLookup,
    private readonly config: { wabaId: string | undefined },
  ) {}

  async execute(tenantId: string, input: unknown): Promise<ConnectResult> {
    const parsed = connectInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? INVALID_FORMAT };
    }
    if (!this.config.wabaId) {
      logger.warn("ConnectWhatsAppNumber: falta la cuenta de WhatsApp Business de la plataforma");
      return { ok: false, error: ERRORS.unavailable };
    }

    let accountNumbers;
    try {
      accountNumbers = await this.lookup.listPhoneNumbers(this.config.wabaId);
    } catch {
      logger.warn("ConnectWhatsAppNumber: el proveedor no pudo verificar el número");
      return { ok: false, error: ERRORS.unavailable };
    }

    const digits = normalizePhone(parsed.data.displayPhone);
    const match = accountNumbers.find((number) => normalizePhone(number.displayPhone) === digits);
    if (!match) return { ok: false, error: ERRORS.notRegistered };

    const outcome = await this.store.upsertPending(tenantId, {
      phoneNumberId: match.phoneNumberId,
      displayPhone: parsed.data.displayPhone,
    });
    if (outcome === "taken") return { ok: false, error: ERRORS.taken };
    return { ok: true };
  }
}
