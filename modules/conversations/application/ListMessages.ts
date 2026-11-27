import type { MessageEntry } from "../domain/Timeline";
import type { ConversationRepository } from "./ConversationRepository";
import {
  MESSAGE_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  normalizeLimit,
  type CursorPageRequest,
  type Page,
} from "./pagination";

/**
 * Caso de uso: últimos mensajes de una conversación, con cursor para cargar los
 * anteriores hacia arriba sin leer la conversación completa.
 */
export class ListMessages {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(
    conversationId: string,
    options: CursorPageRequest = {},
  ): Promise<Page<MessageEntry>> {
    const result = await this.conversationRepository.listMessages(this.tenantId, conversationId, {
      after: decodeCursor(options.cursor),
      limit: normalizeLimit(options.limit, MESSAGE_PAGE_SIZE),
    });

    const oldest = result.items[0];
    return {
      items: result.items,
      nextCursor: result.hasMore && oldest ? encodeCursor({ at: oldest.at, id: oldest.id }) : null,
    };
  }
}
