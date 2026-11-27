import { GOODBYE_AT_SECONDS, MAX_CALL_SECONDS } from "../domain/Call";
import type { CallContextResult, CallRepository } from "./ports";
import type { GetBusinessContext } from "@/modules/business";

export class GetCallContext {
  constructor(
    private readonly calls: CallRepository,
    private readonly getBusinessContext: GetBusinessContext,
  ) {}

  async execute(callId: string): Promise<CallContextResult> {
    const call = await this.calls.findCall(callId);
    if (!call) return { ok: false, error: "not_found" };
    if (call.endedAt) return { ok: false, error: "ended" };

    const [data, businessCtx] = await Promise.all([
      this.calls.loadContext(call.tenantId, call),
      this.getBusinessContext.execute(call.tenantId),
    ]);

    const faqText = businessCtx.faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n");
    const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoursText = businessCtx.hours
      .map((h) => `${weekdayNames[h.weekday] ?? h.weekday}: ${h.opens}-${h.closes}`)
      .join("\n");

    return {
      ok: true,
      context: {
        call_id: call.id,
        business: {
          name: businessCtx.name || data.business.name,
          tone: businessCtx.assistant.tone ?? data.business.tone,
          faq: faqText,
          hours: hoursText,
          voice: businessCtx.assistant.voice || data.business.voice || "roberto",
          language: businessCtx.assistant.language ?? data.business.language,
        },
        contact: {
          display_name: data.contact.displayName,
          is_new: data.contact.isNew,
        },
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
