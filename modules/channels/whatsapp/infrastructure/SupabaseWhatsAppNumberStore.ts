import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";

import type { StoredNumber, WhatsAppNumberStore } from "../application/ports";

/** Adaptador service_role: escribe y lee siempre filtrando por tenant_id explícito. */
export class SupabaseWhatsAppNumberStore implements WhatsAppNumberStore {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async upsertPending(
    tenantId: string,
    number: { phoneNumberId: string; displayPhone: string },
  ): Promise<"saved" | "taken"> {
    const { error } = await this.db.from("whatsapp_numbers").upsert(
      {
        tenant_id: tenantId,
        phone_number_id: number.phoneNumberId,
        display_phone: number.displayPhone,
        status: "pending",
      },
      { onConflict: "tenant_id" },
    );
    if (error?.code === "23505") return "taken";
    if (error) throw new Error(`whatsapp_numbers upsert: ${error.message}`);
    return "saved";
  }

  async findByTenant(tenantId: string): Promise<StoredNumber | null> {
    const { data, error } = await this.db
      .from("whatsapp_numbers")
      .select("phone_number_id, display_phone, status")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(`whatsapp_numbers select: ${error.message}`);
    if (!data) return null;
    return {
      phoneNumberId: data.phone_number_id,
      displayPhone: data.display_phone,
      status: data.status,
    };
  }
}
