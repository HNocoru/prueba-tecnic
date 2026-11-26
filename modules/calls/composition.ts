import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { EndCall } from "./application/EndCall";
import { GetCallContext } from "./application/GetCallContext";
import { HandleCallWebhookEvent } from "./application/HandleCallWebhookEvent";
import { RecordCallTurns } from "./application/RecordCallTurns";
import { RecordWorkerHeartbeat } from "./application/RecordWorkerHeartbeat";
import type { WhatsAppCallGateway } from "./application/ports";
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_CLOUD_API_VERSION,
  LiveKitWhatsAppCallGateway,
} from "./infrastructure/LiveKitWhatsAppCallGateway";
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
  return new HandleCallWebhookEvent(
    new SupabaseCallRepository(createAdminClient()),
    composeWhatsAppCallGateway(),
  );
}

/** Sin credenciales de LiveKit/Meta, contestar falla con un error claro y sin secretos. */
class UnconfiguredGateway implements WhatsAppCallGateway {
  async accept(): Promise<void> {
    throw new Error(
      "Faltan LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET o WHATSAPP_ACCESS_TOKEN: no se puede contestar la llamada",
    );
  }

  async disconnect(): Promise<void> {
    throw new Error("LiveKit no está configurado");
  }
}

function composeWhatsAppCallGateway(): WhatsAppCallGateway {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, WHATSAPP_ACCESS_TOKEN } = serverEnv;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !WHATSAPP_ACCESS_TOKEN) {
    return new UnconfiguredGateway();
  }
  return LiveKitWhatsAppCallGateway.fromCredentials(
    { url: LIVEKIT_URL, apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET },
    {
      whatsappApiKey: WHATSAPP_ACCESS_TOKEN,
      cloudApiVersion: DEFAULT_CLOUD_API_VERSION,
      agentName: DEFAULT_AGENT_NAME,
    },
  );
}
