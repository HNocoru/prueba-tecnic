import type {
  CallContextData,
  CallOutcome,
  CallTurnInput,
  CallWebhookEvent,
  EndCallInput,
  StoredCall,
  TurnRole,
} from "../domain/Call";

/** Lectura y escritura de calls/call_turns; siempre con tenant_id explícito. */
export interface CallRepository {
  findCall(callId: string): Promise<StoredCall | null>;
  /** Arma el contexto mínimo del asistente para una llamada. */
  loadContext(tenantId: string, call: StoredCall): Promise<CallContextData>;
  /** Inserta los turnos que falten; repetir un seq no duplica. */
  insertTurns(tenantId: string, callId: string, turns: CallTurnInput[]): Promise<void>;
  markEnded(tenantId: string, callId: string, input: EndCallInput): Promise<void>;
}

/** Escritura de la fila calls a partir del webhook de Meta. */
export interface CallWebhookRepository {
  startCall(tenantId: string, event: CallWebhookEvent): Promise<void>;
  endCall(tenantId: string, waCallId: string, at: Date): Promise<void>;
}

/** Latido del worker para el indicador de salud. */
export interface WorkerHeartbeat {
  readonly workerId: string;
  readonly activeCalls: number;
  readonly version: string;
}

export type CallContextResult =
  { ok: true; context: CallContextResponse } | { ok: false; error: "not_found" | "ended" };

/** Forma exacta del contrato HTTP (docs/04-worker-contract.md), en snake_case. */
export interface CallContextResponse {
  call_id: string;
  business: {
    name: string;
    tone: string;
    faq: string;
    hours: string;
    voice: string;
    language: string;
  };
  contact: { display_name: string | null; is_new: boolean };
  memory: { summary: string; facts: Record<string, unknown> };
  recent_turns: { role: TurnRole; channel: "text" | "voice"; text: string; at: string }[];
  limits: { max_call_seconds: number; goodbye_at_seconds: number };
}

export type CallMutationResult = { ok: true } | { ok: false; error: "invalid" | "not_found" };

export type { CallOutcome };
