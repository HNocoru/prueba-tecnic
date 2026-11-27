import type { Contact } from "../domain/Contact";
import type { ContactRepository } from "./ContactRepository";
import {
  DEFAULT_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  normalizeLimit,
  type CursorPageRequest,
  type Page,
} from "./pagination";

/**
 * Caso de uso: listar los contactos de un tenant en páginas por cursor.
 * Recibe el puerto por inyección para poder sustituirlo por un repositorio falso en pruebas.
 */
export class ListContacts {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(tenantId: string, options: CursorPageRequest = {}): Promise<Page<Contact>> {
    const result = await this.contactRepository.listContacts(tenantId, {
      after: decodeCursor(options.cursor),
      limit: normalizeLimit(options.limit, DEFAULT_PAGE_SIZE),
    });

    const last = result.items.at(-1);
    return {
      items: result.items,
      nextCursor: result.hasMore && last ? encodeCursor({ at: last.createdAt, id: last.id }) : null,
    };
  }
}
