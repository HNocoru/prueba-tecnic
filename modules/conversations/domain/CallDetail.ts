import type { CallEntry } from "./Timeline";

/** Turno de la transcripción de una llamada. `user` es el cliente; `assistant`, el negocio. */
export type CallTurnRole = "user" | "assistant";

export interface CallTurn {
  readonly id: string;
  readonly tenantId: string;
  readonly callId: string;
  readonly role: CallTurnRole;
  readonly text: string;
  readonly position: number;
}

/** Detalle de una llamada: su reporte y la transcripción, ambos del tenant de la sesión. */
export interface CallDetail {
  readonly call: CallEntry;
  readonly turns: readonly CallTurn[];
}
