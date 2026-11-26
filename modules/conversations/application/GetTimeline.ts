import type { TimelineEntry } from "../domain/Timeline";
import type { ConversationRepository, TimelineFilter } from "./ConversationRepository";

/**
 * Caso de uso: mezcla mensajes y llamadas de una conversación del tenant de la
 * sesión en un único eje cronológico. El tenant viene de la sesión, no de la URL.
 */
export class GetTimeline {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(conversationId: string, filter: TimelineFilter = "all"): Promise<TimelineEntry[]> {
    const entries = await this.conversationRepository.getTimeline(
      this.tenantId,
      conversationId,
      filter,
    );

    return [...entries].sort((a, b) => a.at.localeCompare(b.at));
  }
}
