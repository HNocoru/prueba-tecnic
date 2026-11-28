import { logger } from "@/shared/logger";

import { cleanSecret } from "../application/cleanSecret";
import { redactError } from "../application/redactError";
import type { WhatsAppSenderPort } from "../application/ports";

/** Misma versión de Graph que scripts/meta-check.mts. */
export const GRAPH_API_VERSION = "v25.0";

const MEXICO_NOT_ALLOWED_CODE = 131030;
const MEXICO_521 = /^521\d{10}$/;

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
    const accessToken = cleanSecret("WHATSAPP_ACCESS_TOKEN", this.config.accessToken);
    const phoneNumberId = await this.config.resolvePhoneNumberId(tenantId);
    if (!phoneNumberId) throw new Error("whatsapp_numbers sin phone_number_id para el tenant");

    const version = this.config.graphVersion ?? GRAPH_API_VERSION;
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const post = (recipient: string) =>
      fetchImpl(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body },
        }),
      });

    let response = await post(to);
    if (!response.ok) {
      const failure = await this.describeFailure(response);
      logger.warn({ status: failure.status, code: failure.code }, "Graph rechazó el envío");
      // Trampa de México: la Cloud API espera 52 + 10 dígitos, no 521 + 10 dígitos.
      if (failure.code === MEXICO_NOT_ALLOWED_CODE && MEXICO_521.test(to)) {
        const retryTo = `52${to.slice(-10)}`;
        response = await post(retryTo);
        if (!response.ok) {
          const retryFailure = await this.describeFailure(response);
          logger.warn(
            { status: retryFailure.status, code: retryFailure.code, retried: true },
            "Graph rechazó el reintento mexicano",
          );
          throw new Error(retryFailure.message);
        }
        logger.info("Graph aceptó el reintento con prefijo 52 sin el 1");
      } else {
        throw new Error(failure.message);
      }
    }
    const payload = (await response.json()) as { messages?: { id?: string }[] };
    const wamid = payload.messages?.[0]?.id;
    if (!wamid) throw new Error("Graph no devolvió wamid");
    return wamid;
  }

  /** Lee el error de Meta (sin secretos) y lo pasa por la redacción de tokens. */
  private async describeFailure(
    response: Response,
  ): Promise<{ status: number; code: number | null; message: string }> {
    let code: number | null = null;
    let detail = "";
    try {
      const data = (await response.json()) as {
        error?: { code?: number; message?: string; error_data?: { details?: string } };
      };
      code = typeof data.error?.code === "number" ? data.error.code : null;
      detail = [data.error?.message, data.error?.error_data?.details].filter(Boolean).join(" | ");
    } catch {
      // Cuerpo no JSON: solo el estado.
    }
    let text = `Graph respondió ${response.status}`;
    if (code !== null) text += ` (código ${code})`;
    if (detail) text += `: ${detail}`;
    const token = this.config.accessToken;
    if (token) text = text.split(token).join("[REDACTED]");
    return { status: response.status, code, message: redactError(new Error(text)) };
  }
}
