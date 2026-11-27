import type { CallEntry } from "../domain/Timeline";
import type { ConversationRepository } from "./ConversationRepository";

/** Caso de uso: llamadas de una conversación del tenant de la sesión. */
export class ListCalls {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(conversationId: string): Promise<CallEntry[]> {
    return this.conversationRepository.listCalls(this.tenantId, conversationId);
  }
}
