import type { StoredNumber, WhatsAppNumberStore } from "../application/ports";

/** Réplica en memoria: UNIQUE(tenant_id) y UNIQUE(phone_number_id). */
export class InMemoryNumberStore implements WhatsAppNumberStore {
  readonly rows = new Map<string, StoredNumber>();

  async upsertPending(tenantId: string, n: { phoneNumberId: string; displayPhone: string }) {
    for (const [t, row] of this.rows) {
      if (t !== tenantId && row.phoneNumberId === n.phoneNumberId) return "taken" as const;
    }
    this.rows.set(tenantId, { ...n, status: "pending" });
    return "saved" as const;
  }
  async findByTenant(tenantId: string) {
    return this.rows.get(tenantId) ?? null;
  }
}
