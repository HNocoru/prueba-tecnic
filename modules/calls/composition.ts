import { createAdminClient } from "@/shared/supabase/admin";

import { EndCall } from "./application/EndCall";
import { GetCallContext } from "./application/GetCallContext";
import { HandleCallWebhookEvent } from "./application/HandleCallWebhookEvent";
import { RecordCallTurns } from "./application/RecordCallTurns";
import { RecordWorkerHeartbeat } from "./application/RecordWorkerHeartbeat";
import { SupabaseCallRepository } from "./infrastructure/SupabaseCallRepository";

/** Composition root de la API interna del worker (service_role, sin sesión). */
export function composeCallApi(): {
  getContext: GetCallContext;
  recordTurns: RecordCallTurns;
  endCall: EndCall;
  heartbeat: RecordWorkerHeartbeat;
} {
  const repository = new SupabaseCallRepository(createAdminClient());
  return {
    getContext: new GetCallContext(repository),
    recordTurns: new RecordCallTurns(repository),
    endCall: new EndCall(repository),
    heartbeat: new RecordWorkerHeartbeat(),
  };
}

/** Composition root del webhook calls, compartido con el módulo de WhatsApp. */
export function createCallWebhookHandler(): HandleCallWebhookEvent {
  return new HandleCallWebhookEvent(new SupabaseCallRepository(createAdminClient()));
}
