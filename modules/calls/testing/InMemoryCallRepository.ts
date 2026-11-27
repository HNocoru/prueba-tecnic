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
  private readonly byWaCallId = new Map<string, string>();
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
    // Replica UNIQUE (call_id, position) + ON CONFLICT DO NOTHING: gana la primera fila.
    const stored = [...existing];
    const seen = new Set(existing.map((turn) => turn.seq));
    for (const turn of turns) {
      if (seen.has(turn.seq)) continue;
      seen.add(turn.seq);
      stored.push(turn);
    }
    this.turns.set(callId, stored);
  }

  async markEnded(_tenantId: string, callId: string, input: EndCallInput): Promise<void> {
    const call = this.calls.get(callId);
    if (call) this.calls.set(callId, { ...call, endedAt: input.endedAt });
    this.lastEnd = input;
  }

  async startCall(
    tenantId: string,
    event: CallWebhookEvent,
  ): Promise<{ callId: string; created: boolean }> {
    if (!event.waId) throw new Error("La llamada no trae wa_id del contacto");
    const known = this.byWaCallId.get(event.waCallId);
    if (known) return { callId: known, created: false };
    this.starts.push({ tenantId, event });
    const id = `00000000-0000-4000-8000-00000000000${this.starts.length}`;
    this.byWaCallId.set(event.waCallId, id);
    this.calls.set(id, {
      id,
      tenantId,
      conversationId: `conversation-${event.waId}`,
      startedAt: event.occurredAt.toISOString(),
      endedAt: null,
      waCallId: event.waCallId,
    });
    return { callId: id, created: true };
  }
}
