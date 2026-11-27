import { z } from "zod";

import type { CallMutationResult, CallRepository, WhatsAppCallGateway } from "./ports";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "fecha inválida",
});

const endSchema = z.object({
  ended_reason: z.enum(["completed", "caller_hangup", "time_limit", "failed"]),
  answered_at: isoDate.nullable(),
  ended_at: isoDate,
  duration_sec: z.number().int().nonnegative(),
  error: z.string().nullable(),
});

/**
 * Caso de uso: cierra la llamada con el resultado que reporta el worker.
 * Repetir el mismo end responde ok y deja los mismos valores (idempotente).
 * Con time_limit cuelga la llamada en Meta (BUSINESS_INITIATED) una sola vez.
 */
export class EndCall {
  constructor(
    private readonly calls: CallRepository,
    private readonly gateway: WhatsAppCallGateway,
  ) {}

  async execute(callId: string, input: unknown): Promise<CallMutationResult> {
    const parsed = endSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const call = await this.calls.findCall(callId);
    if (!call) return { ok: false, error: "not_found" };

    await this.calls.markEnded(call.tenantId, call.id, {
      endedReason: parsed.data.ended_reason,
      answeredAt: parsed.data.answered_at,
      endedAt: parsed.data.ended_at,
      durationSec: parsed.data.duration_sec,
      error: parsed.data.error,
    });

    // Un end repetido (la fila ya estaba cerrada) no vuelve a colgar.
    if (parsed.data.ended_reason === "time_limit" && call.waCallId && !call.endedAt) {
      await this.disconnectBestEffort(call.waCallId);
    }
    return { ok: true };
  }

  /** Si Meta ya terminó la llamada el Connector falla: se ignora y el end responde 200. */
  private async disconnectBestEffort(waCallId: string): Promise<void> {
    try {
      await this.gateway.disconnect(waCallId, "business_initiated");
    } catch (error) {
      console.warn(
        "No se pudo colgar la llamada tras time_limit:",
        error instanceof Error ? error.message : "error desconocido",
      );
    }
  }
}
