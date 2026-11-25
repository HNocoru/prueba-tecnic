import type { Contact } from "../domain/Contact";
import type { ContactRepository } from "./ContactRepository";

/**
 * Caso de uso: listar los contactos de un tenant.
 * Recibe el puerto por inyección para poder sustituirlo por un repositorio falso en pruebas.
 */
export class ListContacts {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(tenantId: string): Promise<Contact[]> {
    return this.contactRepository.listContacts(tenantId);
  }
}
