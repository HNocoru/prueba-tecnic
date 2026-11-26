import type { ConnectionStatus } from "../domain/connectionCard";
import type { WhatsAppNumberStore } from "./ports";

export interface WhatsAppConnection {
  status: ConnectionStatus;
  phoneNumberId: string | null;
  displayPhone: string | null;
  webhookUrl: string;
  verifyTokenConfigured: boolean;
}

export interface ConnectionConfig {
  appUrl: string | undefined;
  verifyTokenConfigured: boolean;
}

const KNOWN: ConnectionStatus[] = ["pending", "connected", "disconnected"];

/** Lectura del estado de conexión. Nunca incluye el token ni el app secret. */
export class GetWhatsAppConnection {
  constructor(
    private readonly store: WhatsAppNumberStore,
    private readonly config: ConnectionConfig,
  ) {}

  async execute(tenantId: string): Promise<WhatsAppConnection> {
    const row = await this.store.findByTenant(tenantId);
    const status = KNOWN.find((s) => s === row?.status) ?? "not_connected";
    return {
      status: row ? status : "not_connected",
      phoneNumberId: row?.phoneNumberId ?? null,
      displayPhone: row?.displayPhone ?? null,
      webhookUrl: `${this.config.appUrl ?? ""}/api/whatsapp/webhook`,
      verifyTokenConfigured: this.config.verifyTokenConfigured,
    };
  }
}
