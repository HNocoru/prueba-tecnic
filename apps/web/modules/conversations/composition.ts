import { ListContacts } from "./application/ListContacts";
import { createSupabaseContactRepository } from "./infrastructure/SupabaseContactRepository";

/**
 * Composition root del modulo conversations: arma el caso de uso con su adaptador.
 */
export function composeListContacts(): ListContacts {
  const contactRepository = createSupabaseContactRepository();
  const listContacts = new ListContacts(contactRepository);

  return listContacts;
}
