import type { Contact } from "../domain/Contact";

/**
 * Puerto (interfaz) de repositorio de contactos.
 * La aplicación depende de este contrato, nunca del adaptador de Supabase.
 */
export interface ContactRepository {
  listContacts(tenantId: string): Promise<Contact[]>;
}
