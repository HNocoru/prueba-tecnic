/** API pública del módulo channels/whatsapp. */
export { IngestWhatsAppWebhook } from "./application/IngestWhatsAppWebhook";
export { verifyHandshake, verifySignature } from "./application/signature";
export type { InboundMessage } from "./domain/InboundMessage";
export { ConnectWhatsAppNumber } from "./application/ConnectWhatsAppNumber";
export type { ConnectResult } from "./application/ConnectWhatsAppNumber";
export { GetWhatsAppConnection } from "./application/GetWhatsAppConnection";
export type { WhatsAppConnection } from "./application/GetWhatsAppConnection";
export { decideConnectionCard } from "./domain/connectionCard";
export type { ConnectionCardView, ConnectionStatus } from "./domain/connectionCard";
