import type { AccountPhoneNumber, WhatsAppNumberLookup } from "../application/ports";

/** Misma versión de Graph que modules/assistant y scripts/meta-check.mts. */
const GRAPH_API_VERSION = "v25.0";
const TIMEOUT_MS = 10_000;
const ATTEMPTS = 2;

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

interface GraphPhone {
  id?: string;
  display_phone_number?: string;
}

/**
 * Consulta los números de la WABA con el token del servidor. El token solo viaja en
 * la cabecera; ningún error incluye credenciales ni cuerpos de respuesta.
 */
export class GraphWhatsAppNumberLookup implements WhatsAppNumberLookup {
  constructor(
    private readonly config: {
      accessToken: string | undefined;
      graphVersion?: string;
      timeoutMs?: number;
      attempts?: number;
      fetchImpl?: FetchImpl;
    },
  ) {}

  async listPhoneNumbers(wabaId: string): Promise<AccountPhoneNumber[]> {
    if (!this.config.accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN no configurado");

    const fetchImpl = this.config.fetchImpl ?? fetch;
    const version = this.config.graphVersion ?? GRAPH_API_VERSION;
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name`;
    const attempts = this.config.attempts ?? ATTEMPTS;
    const timeoutMs = this.config.timeoutMs ?? TIMEOUT_MS;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          headers: { Authorization: `Bearer ${this.config.accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Graph respondió ${response.status}`);
        const payload = (await response.json()) as { data?: GraphPhone[] };
        return (payload.data ?? []).flatMap((phone) =>
          phone.id && phone.display_phone_number
            ? [
                {
                  phoneNumberId: phone.id,
                  displayPhone: phone.display_phone_number,
                },
              ]
            : [],
        );
      } catch {
        // Un reintento cubre expiraciones y fallos transitorios sin filtrar detalles.
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error("Graph no devolvió los números de la cuenta");
  }
}
