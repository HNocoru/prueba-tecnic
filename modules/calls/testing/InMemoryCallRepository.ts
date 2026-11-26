import type { CallRepository, CallWebhookRepository } from "../application/ports";
import type {
  CallContextData,
  CallTurnInput,
  CallWebhookEvent,
  EndCallInput,
  StoredCall,
} from "../domain/Call";

/** Repositorio en memoria que replica la idempotencia por (call_id, seq) y por wa_call_id. */
export class InMemoryCallRepository implements CallRepository, CallWebhookRepository {
  readonly calls = new Map<string, StoredCall>();
  readonly turns = new Map<string, CallTurnInput[]>();
  readonly starts: { tenantId: string; event: CallWebhookEvent }[] = [];
  readonly terminations: { tenantId: string; waCallId: string; at: Date }[] = [];
  lastEnd: EndCallInput | null = null;
  context: CallContextData = {
    business: {
      name: "Negocio",
      tone: "cercano",
      faq: "",
      hours: "",
      voice: "roberto",
      language: "es",
    },
    contact: { displayName: null, isNew: true },
    recentTurns: [],
  };

  async findCall(callId: string): Promise<StoredCall | null> {
    return this.calls.get(callId) ?? null;
  }

  async loadContext(): Promise<CallContextData> {
    return this.context;
  }

  async insertTurns(_tenantId: string, callId: string, turns: CallTurnInput[]): Promise<void> {
    const existing = this.turns.get(callId) ?? [];
    const seen = new Set(existing.map((turn) => turn.seq));
    this.turns.set(callId, [...existing, ...turns.filter((turn) => !seen.has(turn.seq))]);
  }

  async markEnded(_tenantId: string, callId: string, input: EndCallInput): Promise<void> {
    const call = this.calls.get(callId);
    if (call) this.calls.set(callId, { ...call, endedAt: input.endedAt });
    this.lastEnd = input;
  }

  async startCall(tenantId: string, event: CallWebhookEvent): Promise<void> {
    if (!event.waId) throw new Error("La llamada no trae wa_id del contacto");
    this.starts.push({ tenantId, event });
    const id = `call-${this.starts.length}`;
    this.calls.set(id, {
      id,
      tenantId,
      conversationId: `conversation-${event.waId}`,
      startedAt: event.occurredAt.toISOString(),
      endedAt: null,
    });
  }

  async endCall(tenantId: string, waCallId: string, at: Date): Promise<void> {
    this.terminations.push({ tenantId, waCallId, at });
  }
}
