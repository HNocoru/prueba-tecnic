import type { ConversationSummary, ConversationRepository } from "./ConversationRepository";

/**
 * Caso de uso: obtiene una conversación concreta del tenant de la sesión.
 * Corrige la deuda del slice 03: un enlace directo ya no depende de la primera página.
 */
export class GetConversation {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(conversationId: string): Promise<ConversationSummary | null> {
    return this.conversationRepository.getConversation(this.tenantId, conversationId);
  }
}
