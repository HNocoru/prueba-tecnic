import { createClient } from "@/shared/supabase/server";
import { GetCallDetail } from "./application/GetCallDetail";
import { GetConversation } from "./application/GetConversation";
import { GetTimeline } from "./application/GetTimeline";
import { ListCalls } from "./application/ListCalls";
import { ListContactRequests } from "./application/ListContactRequests";
import { ListContacts } from "./application/ListContacts";
import { ListConversations } from "./application/ListConversations";
import { ListMessages } from "./application/ListMessages";
import { SupabaseContactRepository } from "./infrastructure/SupabaseContactRepository";
import { SupabaseConversationRepository } from "./infrastructure/SupabaseConversationRepository";

/** Tenant de la sesión resuelto por la RPC; nunca viene de la URL. */
async function resolveSessionTenant(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  tenantId: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_tenant");

  if (error || !data?.length) {
    throw new Error("No se pudo resolver el tenant de la sesión");
  }

  return { supabase, tenantId: data[0] };
}

/**
 * Composition root del módulo conversations para la bandeja.
 * La RLS del cliente de sesión es la última defensa de cada consulta.
 */
export async function composeInbox(): Promise<{
  listConversations: ListConversations;
  getConversation: GetConversation;
  getTimeline: GetTimeline;
  listMessages: ListMessages;
  listCalls: ListCalls;
  listContactRequests: ListContactRequests;
  getCallDetail: GetCallDetail;
}> {
  const { supabase, tenantId } = await resolveSessionTenant();
  const conversationRepository = new SupabaseConversationRepository(supabase);

  return {
    listConversations: new ListConversations(conversationRepository, tenantId),
    getConversation: new GetConversation(conversationRepository, tenantId),
    getTimeline: new GetTimeline(conversationRepository, tenantId),
    listMessages: new ListMessages(conversationRepository, tenantId),
    listCalls: new ListCalls(conversationRepository, tenantId),
    listContactRequests: new ListContactRequests(conversationRepository, tenantId),
    getCallDetail: new GetCallDetail(conversationRepository, tenantId),
  };
}

/** Composition root de la pantalla de contactos. */
export async function composeContacts(): Promise<{
  listContacts: ListContacts;
  tenantId: string;
}> {
  const { supabase, tenantId } = await resolveSessionTenant();
  return { listContacts: new ListContacts(new SupabaseContactRepository(supabase)), tenantId };
}
