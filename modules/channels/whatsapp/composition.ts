import { createAdminClient } from "@/shared/supabase/admin";

import { IngestWhatsAppWebhook } from "./application/IngestWhatsAppWebhook";
import { SupabaseChannelStore } from "./infrastructure/SupabaseChannelStore";

/** Composition root: arma la ingesta con el adaptador de Supabase (service_role). */
export function composeIngestWhatsAppWebhook(): IngestWhatsAppWebhook {
  const store = new SupabaseChannelStore(createAdminClient());
  return new IngestWhatsAppWebhook(store, store, store);
}
