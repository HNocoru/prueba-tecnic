import type { ContactRequest } from "../domain/Request";
import type { ConversationRepository } from "./ConversationRepository";

/**
 * Caso de uso: solicitudes de un contacto del tenant de la sesión, de la más
 * reciente a la más antigua. El tenant nunca viene del cliente.
 */
export class ListContactRequests {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly tenantId: string,
  ) {}

  async execute(contactId: string): Promise<ContactRequest[]> {
    const requests = await this.conversationRepository.listRequests(this.tenantId, [contactId]);

    return [...requests].sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? 1 : -1;
      }
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });
  }
}
