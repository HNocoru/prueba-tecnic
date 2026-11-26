import { z } from "zod";

import type { CallMutationResult, CallRepository } from "./ports";

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
 */
export class EndCall {
  constructor(private readonly calls: CallRepository) {}

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
    return { ok: true };
  }
}
