import { after } from "next/server";

import { dispatchAssistantReplies } from "@/modules/assistant";
import { composeReplyToInboundMessage } from "@/modules/assistant/composition";
import { verifyHandshake, verifySignature } from "@/modules/channels/whatsapp";
import { composeIngestWhatsAppWebhook } from "@/modules/channels/whatsapp/composition";
import { serverEnv } from "@/shared/env.server";

/** Handshake de verificación de Meta. */
export function GET(request: Request): Response {
  const challenge = verifyHandshake(
    new URL(request.url).searchParams,
    serverEnv.WHATSAPP_VERIFY_TOKEN,
  );
  if (challenge === null) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

/**
 * Webhook de Meta (campos messages y calls): verifica la firma sobre el cuerpo crudo
 * y procesa después de responder 200.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  if (
    !verifySignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      serverEnv.WHATSAPP_APP_SECRET,
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const ingest = composeIngestWhatsAppWebhook();
  after(async () => {
    try {
      const created = await ingest.execute(rawBody);
      await dispatchAssistantReplies(() => composeReplyToInboundMessage(), created);
    } catch {
      // El 200 ya salió: ningún fallo del asistente debe provocar reintentos de Meta.
    }
  });
  return new Response("OK", { status: 200 });
}
