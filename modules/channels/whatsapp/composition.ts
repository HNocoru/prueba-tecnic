import { createCallWebhookHandler } from "@/modules/calls";
import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { IngestWhatsAppWebhook } from "./application/IngestWhatsAppWebhook";
import { ConnectWhatsAppNumber } from "./application/ConnectWhatsAppNumber";
import { GetWhatsAppConnection } from "./application/GetWhatsAppConnection";
import { SupabaseChannelStore } from "./infrastructure/SupabaseChannelStore";
import { SupabaseWhatsAppNumberStore } from "./infrastructure/SupabaseWhatsAppNumberStore";

/** Composition root: arma la ingesta con el adaptador de Supabase (service_role). */
export function composeIngestWhatsAppWebhook(): IngestWhatsAppWebhook {
  const store = new SupabaseChannelStore(createAdminClient());
  const callHandler = createCallWebhookHandler();
  // El tenant lo resuelve whatsapp (dueño de whatsapp_numbers); calls solo recibe el evento.
  const calls = {
    handle: (tenantId: string, event: Parameters<typeof callHandler.execute>[1]) =>
      callHandler.execute(tenantId, event),
  };
  return new IngestWhatsAppWebhook(store, store, store, calls);
}

/** Composition root del flujo "conectar número". */
export function composeWhatsAppConnection(): {
  connect: ConnectWhatsAppNumber;
  get: GetWhatsAppConnection;
} {
  const store = new SupabaseWhatsAppNumberStore(createAdminClient());
  return {
    connect: new ConnectWhatsAppNumber(store),
    get: new GetWhatsAppConnection(store, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ""),
      verifyTokenConfigured: Boolean(serverEnv.WHATSAPP_VERIFY_TOKEN),
    }),
  };
}
