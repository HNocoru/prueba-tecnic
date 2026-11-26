import { z } from "zod";

import type { WhatsAppNumberStore } from "./ports";

export const connectInputSchema = z.object({
  phoneNumberId: z.string().regex(/^\d{15,20}$/, "El ID del número debe tener 15 a 20 dígitos."),
  displayPhone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "El número debe estar en formato internacional, ej. +5215512345678.",
    ),
});

export type ConnectResult = { ok: true } | { ok: false; error: string };

/** Caso de uso: vincula (o reemplaza) el número de WhatsApp del tenant, en estado pendiente. */
export class ConnectWhatsAppNumber {
  constructor(private readonly store: WhatsAppNumberStore) {}

  async execute(tenantId: string, input: unknown): Promise<ConnectResult> {
    const parsed = connectInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const outcome = await this.store.upsertPending(tenantId, parsed.data);
    if (outcome === "taken") {
      return { ok: false, error: "Ese ID de número ya está conectado a otro negocio." };
    }
    return { ok: true };
  }
}
