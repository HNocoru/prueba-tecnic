import type { CallDetail } from "../domain/CallDetail";
import type { ConversationRepository } from "./ConversationRepository";

/**
 * Caso de uso: detalle de una llamada (reporte y turnos) dentro del tenant de la
 * sesión. Devuelve `null` si la llamada no existe o pertenece a otro tenant.
 */
export class GetCallDetail {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(callId: string): Promise<CallDetail | null> {
    const detail = await this.conversationRepository.getCallDetail(this.tenantId, callId);
    if (!detail) {
      return null;
    }

    return {
      call: detail.call,
      turns: [...detail.turns].sort((a, b) => a.position - b.position),
    };
  }
}
