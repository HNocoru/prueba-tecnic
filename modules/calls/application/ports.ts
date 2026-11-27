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

/** Alta de la fila calls a partir del webhook de Meta; el cierre lo hace el end del worker. */
export interface CallWebhookRepository {
  /** `created` es false cuando la fila ya existía (reintento del webhook de Meta). */
  startCall(
    tenantId: string,
    event: CallWebhookEvent,
  ): Promise<{ callId: string; created: boolean }>;
}

/** Datos para contestar una llamada entrante; el token de Meta vive solo en el adaptador. */
export interface AcceptCallInput {
  /** UUID interno de calls.id; viaja al worker como metadata/atributo (call_id). */
  readonly callId: string;
  readonly waCallId: string;
  readonly phoneNumberId: string;
  readonly sdpOffer: string;
  readonly roomName: string;
  /** Mismo JSON que GET /context, ya armado; viaja en la metadata del despacho del agente. */
  readonly contextSnapshot?: unknown;
}

export type DisconnectReason = "user_initiated" | "business_initiated";

/** Puerto hacia el WhatsApp Connector de LiveKit (AcceptWhatsAppCall / DisconnectWhatsAppCall). */
export interface WhatsAppCallGateway {
  accept(input: AcceptCallInput): Promise<void>;
  /**
   * Cuelga el lado LiveKit. user_initiated: Meta ya terminó la llamada (terminate);
   * business_initiated: nosotros la cerramos (time_limit) y Meta debe enterarse.
   */
  disconnect(waCallId: string, reason: DisconnectReason): Promise<void>;
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

/** El resumen se programa después de responder el end; el puerto no conoce a Next. */
export interface ScheduleCallSummary {
  schedule(tenantId: string, callId: string): void;
}

/** Memoria por contacto; la implementa el repositorio de modules/memory. */
export interface CallMemoryReader {
  readForCall(
    tenantId: string,
    callId: string,
  ): Promise<{ summary: string; facts: Record<string, unknown> }>;
}

export type { CallOutcome };
