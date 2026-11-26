import { createClient } from "@/shared/supabase/server";
import { GetTimeline } from "./application/GetTimeline";
import { ListConversations } from "./application/ListConversations";
import { SupabaseConversationRepository } from "./infrastructure/SupabaseConversationRepository";

/**
 * Composition root del módulo conversations para la bandeja.
 * El tenant se resuelve con current_tenant() sobre la sesión del usuario; nunca
 * viene de la URL. La RLS del cliente de sesión es la última defensa.
 */
export async function composeInbox(): Promise<{
  listConversations: ListConversations;
  getTimeline: GetTimeline;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_tenant");

  if (error || !data?.length) {
    throw new Error("No se pudo resolver el tenant de la sesión");
  }

  const tenantId = data[0];
  const conversationRepository = new SupabaseConversationRepository(supabase);

  return {
    listConversations: new ListConversations(conversationRepository, tenantId),
    getTimeline: new GetTimeline(conversationRepository, tenantId),
  };
}
