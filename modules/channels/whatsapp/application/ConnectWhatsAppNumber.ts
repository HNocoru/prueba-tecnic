import { normalizePhone } from "@/modules/assistant";
import { z } from "zod";

import type { WhatsAppNumberLookup, WhatsAppNumberStore } from "./ports";

/** Acepta espacios y guiones: el usuario escribe el número tal como lo ve. */
const displayPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.replace(/[\s-]/g, "") : value),
  z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "El número debe estar en formato internacional, ej. +5215512345678.",
    ),
);

export const connectInputSchema = z.object({ displayPhone: displayPhoneSchema });

export type ConnectResult = { ok: true } | { ok: false; error: string };

const ERRORS = {
  wabaMissing: "Falta configurar la cuenta de WhatsApp Business de la plataforma.",
  notRegistered:
    "Ese número no está registrado en WhatsApp Business. Verifícalo con tu proveedor e inténtalo de nuevo.",
  graphFailed: "No pudimos verificar tu número con WhatsApp. Inténtalo de nuevo.",
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
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    if (!this.config.wabaId) return { ok: false, error: ERRORS.wabaMissing };

    let accountNumbers;
    try {
      accountNumbers = await this.lookup.listPhoneNumbers(this.config.wabaId);
    } catch {
      return { ok: false, error: ERRORS.graphFailed };
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
