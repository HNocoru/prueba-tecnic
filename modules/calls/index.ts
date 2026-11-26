/** API pública del módulo calls. */
export { HandleCallWebhookEvent } from "./application/HandleCallWebhookEvent";
export { verifyWorkerAuthorization } from "./application/verifyWorkerAuthorization";
export type { CallContextResponse } from "./application/ports";
export type {
  CallOutcome,
  CallWebhookEvent,
  CallWebhookEventName,
  StoredCall,
  TurnRole,
} from "./domain/Call";
export { createCallWebhookHandler } from "./composition";
