import type { Contact } from "../domain/Contact";
import type { CursorPageOptions, CursorPageResult } from "./pagination";

/**
 * Puerto (interfaz) de repositorio de contactos.
 * La aplicación depende de este contrato, nunca del adaptador de Supabase.
 */
export interface ContactRepository {
  /** Página de contactos ordenada por (created_at, id) descendente. */
  listContacts(tenantId: string, options: CursorPageOptions): Promise<CursorPageResult<Contact>>;
}
