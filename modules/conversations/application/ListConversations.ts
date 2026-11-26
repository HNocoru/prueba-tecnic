import type { ConversationSummary, ConversationRepository } from "./ConversationRepository";

/**
 * Caso de uso: lista las conversaciones del tenant de la sesión, con su contacto y
 * último mensaje, ordenadas por actividad más reciente primero.
 */
export class ListConversations {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(): Promise<ConversationSummary[]> {
    const summaries = await this.conversationRepository.listConversations(this.tenantId);

    return [...summaries].sort((a, b) =>
      b.conversation.lastActivityAt.localeCompare(a.conversation.lastActivityAt),
    );
  }
}
