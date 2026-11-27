import { after } from "next/server";

import type { SummarizeConversation } from "@/modules/memory";

import type {
  ConversationSummaryRequest,
  ConversationSummaryScheduler,
} from "../application/ports";

/** Código fijo: nunca se registra texto del cliente ni mensajes del proveedor. */
const LOG_CODE = "S22_MEMORY_SUMMARY_FAILED";

/**
 * Programa el resumen después de responder el webhook, igual que AfterCallSummary.
 * after() puede anidarse dentro del after() del webhook (Next 16.4).
 */
export class AfterConversationSummary implements ConversationSummaryScheduler {
  constructor(private readonly summarize: SummarizeConversation) {}

  schedule(request: ConversationSummaryRequest): void {
    try {
      after(async () => {
        try {
          const result = await this.summarize.execute(
            request.tenantId,
            request.contactId,
            request.turns,
          );
          if (result.status === "failed") console.warn(LOG_CODE, result.reason);
        } catch {
          console.warn(LOG_CODE, "unexpected");
        }
      });
    } catch {
      console.warn(LOG_CODE, "not_in_request");
    }
  }
}
