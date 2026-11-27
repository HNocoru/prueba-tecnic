import type { ConversationSummary, ConversationRepository } from "./ConversationRepository";
import {
  DEFAULT_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  normalizeLimit,
  type CursorPageRequest,
  type Page,
} from "./pagination";

/**
 * Caso de uso: lista las conversaciones del tenant de la sesión, con su contacto y
 * último mensaje, por actividad más reciente primero y en páginas acotadas.
 */
export class ListConversations {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(options: CursorPageRequest = {}): Promise<Page<ConversationSummary>> {
    const result = await this.conversationRepository.listConversations(this.tenantId, {
      after: decodeCursor(options.cursor),
      limit: normalizeLimit(options.limit, DEFAULT_PAGE_SIZE),
    });

    const last = result.items.at(-1);
    return {
      items: result.items,
      nextCursor:
        result.hasMore && last
          ? encodeCursor({ at: last.conversation.lastActivityAt, id: last.conversation.id })
          : null,
    };
  }
}
