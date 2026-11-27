import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { ReplyToInboundMessage } from "./application/ReplyToInboundMessage";
import { GroqLlmAdapter } from "./infrastructure/GroqLlmAdapter";
import { GraphWhatsAppSender } from "./infrastructure/GraphWhatsAppSender";
import { SupabaseAssistantStore } from "./infrastructure/SupabaseAssistantStore";
import { BusinessContextReaderAdapter } from "./infrastructure/BusinessContextReaderAdapter";
import { composeBusinessContextForService } from "@/modules/business";

/** Composition root del asistente de texto (service_role, sin sesión de usuario). */
export function composeReplyToInboundMessage(): ReplyToInboundMessage {
  const db = createAdminClient();
  const store = new SupabaseAssistantStore(db);

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
  });
}
