import type { ConnectionStatus } from "../domain/connectionCard";
import type { WhatsAppNumberStore } from "./ports";

export interface WhatsAppConnection {
  status: ConnectionStatus;
  displayPhone: string | null;
}

const KNOWN: ConnectionStatus[] = ["pending", "connected", "disconnected"];

/** Lectura del estado de conexión. Nunca incluye datos de la plataforma ni secretos. */
export class GetWhatsAppConnection {
  constructor(private readonly store: WhatsAppNumberStore) {}

  async execute(tenantId: string): Promise<WhatsAppConnection> {
    const row = await this.store.findByTenant(tenantId);
    const status = KNOWN.find((s) => s === row?.status) ?? "not_connected";
    return {
      status: row ? status : "not_connected",
      displayPhone: row?.displayPhone ?? null,
    };
  }
}
