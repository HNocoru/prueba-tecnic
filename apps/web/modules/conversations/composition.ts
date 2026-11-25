import { createClient } from "@/lib/supabase/server";
import { ListContacts } from "./application/ListContacts";
import { SupabaseContactRepository } from "./infrastructure/SupabaseContactRepository";

/**
 * Composition root del modulo conversations: arma el caso de uso con su adaptador.
 * El cliente de Supabase (sesion del usuario, por request) viene de lib/supabase/server.
 */
export async function composeListContacts(): Promise<ListContacts> {
  const supabase = await createClient();
  const contactRepository = new SupabaseContactRepository(supabase);

  return new ListContacts(contactRepository);
}
