import type { ReplyToInboundMessage } from "./ReplyToInboundMessage";

/** Mensaje nuevo devuelto por la ingesta del webhook. */
export interface InboundTrigger {
  readonly tenantId: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly kind: "text" | "audio" | "image" | "document";
}

/**
 * Despacha las respuestas después del 200 a Meta. Nunca propaga errores: el webhook
 * ya contestó y un reintento de Meta no debe transformarse en un ciclo de fallos.
 */
export async function dispatchAssistantReplies(
  compose: () => Pick<ReplyToInboundMessage, "execute">,
  triggers: readonly InboundTrigger[],
): Promise<void> {
  try {
    const useCase = compose();
    for (const trigger of triggers) {
      try {
        await useCase.execute(trigger.tenantId, trigger.conversationId, trigger.messageId);
      } catch {
        // El caso de uso registra el fallo; aquí solo se absorbe.
      }
    }
  } catch {
    // Sin asistente configurado no se bloquea la ingesta.
  }
}
