import { z } from "zod";

import type { CallMutationResult, CallRepository } from "./ports";

const turnsSchema = z.object({
  turns: z
    .array(
      z.object({
        seq: z.number().int().nonnegative(),
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1),
        started_ms: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

/**
 * Caso de uso: guarda turnos incrementales de transcripción.
 * Idempotente por (call_id, seq): reenviar un seq ya guardado no lo duplica.
 */
export class RecordCallTurns {
  constructor(private readonly calls: CallRepository) {}

  async execute(callId: string, input: unknown): Promise<CallMutationResult> {
    const parsed = turnsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const call = await this.calls.findCall(callId);
    if (!call) return { ok: false, error: "not_found" };

    await this.calls.insertTurns(
      call.tenantId,
      call.id,
      parsed.data.turns.map((turn) => ({
        seq: turn.seq,
        role: turn.role,
        text: turn.text,
        startedMs: turn.started_ms,
      })),
    );
    return { ok: true };
  }
}
