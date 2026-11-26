import { GOODBYE_AT_SECONDS, MAX_CALL_SECONDS } from "../domain/Call";
import type { CallContextResult, CallRepository } from "./ports";

/**
 * Caso de uso: contexto mínimo del asistente antes de abrir la sesión de voz.
 * 404 si la llamada no existe; 409 (ended) si ya terminó.
 */
export class GetCallContext {
  constructor(private readonly calls: CallRepository) {}

  async execute(callId: string): Promise<CallContextResult> {
    const call = await this.calls.findCall(callId);
    if (!call) return { ok: false, error: "not_found" };
    if (call.endedAt) return { ok: false, error: "ended" };

    const data = await this.calls.loadContext(call.tenantId, call);

    return {
      ok: true,
      context: {
        call_id: call.id,
        business: {
          name: data.business.name,
          tone: data.business.tone,
          faq: data.business.faq,
          hours: data.business.hours,
          voice: data.business.voice,
          language: data.business.language,
        },
        contact: {
          display_name: data.contact.displayName,
          is_new: data.contact.isNew,
        },
        // Deuda: contact_memory aún no existe; el resumen se implementa en el slice 05.
        memory: { summary: "", facts: {} },
        recent_turns: data.recentTurns.map((turn) => ({
          role: turn.role,
          channel: turn.channel,
          text: turn.text,
          at: turn.at,
        })),
        limits: {
          max_call_seconds: MAX_CALL_SECONDS,
          goodbye_at_seconds: GOODBYE_AT_SECONDS,
        },
      },
    };
  }
}
