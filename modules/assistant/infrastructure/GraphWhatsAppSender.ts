import type { WhatsAppSenderPort } from "../application/ports";

/** Misma versión de Graph que scripts/meta-check.mts. */
export const GRAPH_API_VERSION = "v25.0";

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Envío de texto por Graph API. El token se usa solo en la petición: ningún mensaje
 * de error lo incluye.
 */
export class GraphWhatsAppSender implements WhatsAppSenderPort {
  constructor(
    private readonly config: {
      accessToken: string | undefined;
      graphVersion?: string;
      resolvePhoneNumberId: (tenantId: string) => Promise<string | null>;
      fetchImpl?: FetchImpl;
    },
  ) {}

  async sendText(tenantId: string, to: string, body: string): Promise<string> {
    if (!this.config.accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN no configurado");
    const phoneNumberId = await this.config.resolvePhoneNumberId(tenantId);
    if (!phoneNumberId) throw new Error("whatsapp_numbers sin phone_number_id para el tenant");

    const version = this.config.graphVersion ?? GRAPH_API_VERSION;
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );

    if (!response.ok) throw new Error(`Graph respondió ${response.status}`);
    const payload = (await response.json()) as { messages?: { id?: string }[] };
    const wamid = payload.messages?.[0]?.id;
    if (!wamid) throw new Error("Graph no devolvió wamid");
    return wamid;
  }
}
