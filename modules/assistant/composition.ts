import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { ReplyToInboundMessage } from "./application/ReplyToInboundMessage";
import { GroqLlmAdapter } from "./infrastructure/GroqLlmAdapter";
import { GraphWhatsAppSender } from "./infrastructure/GraphWhatsAppSender";
import { SupabaseAssistantStore } from "./infrastructure/SupabaseAssistantStore";
import { SupabaseRequestWriter } from "./infrastructure/SupabaseRequestWriter";
import { BusinessContextReaderAdapter } from "./infrastructure/BusinessContextReaderAdapter";
import { composeBusinessContextForService } from "@/modules/business";
import { createMemoryApi } from "@/modules/memory";

import { AfterConversationSummary } from "./infrastructure/AfterConversationSummary";
import { SupabaseTextMemoryReader } from "./infrastructure/SupabaseTextMemoryReader";

/** Composition root del asistente de texto (service_role, sin sesión de usuario). */
export function composeReplyToInboundMessage(): ReplyToInboundMessage {
  const db = createAdminClient();
  const store = new SupabaseAssistantStore(db);
  const textMemory = new SupabaseTextMemoryReader(db);
  const memory = createMemoryApi(db);

  return new ReplyToInboundMessage({
    inbound: store,
    // Contexto real del negocio (service_role, tenant explícito) desde modules/business.
    business: new BusinessContextReaderAdapter(composeBusinessContextForService()),
    history: store,
    llm: new GroqLlmAdapter({
      apiKey: serverEnv.GROQ_API_KEY,
      model: serverEnv.LLM_MODEL,
    }),
    sender: new GraphWhatsAppSender({
      accessToken: serverEnv.WHATSAPP_ACCESS_TOKEN,
      resolvePhoneNumberId: (tenantId) => store.findPhoneNumberId(tenantId),
    }),
    messages: store,
    events: store,
    requests: new SupabaseRequestWriter(db),
    memory: textMemory,
    recentCalls: textMemory,
    newMessages: textMemory,
    summaryScheduler: new AfterConversationSummary(memory.summarizeConversation),
  });
}
