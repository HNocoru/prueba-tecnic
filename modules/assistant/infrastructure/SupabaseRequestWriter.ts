import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/db";
import type { OpenRequest, RequestWriteInput, RequestWriter } from "../application/RequestWriter";

export class SupabaseRequestWriter implements RequestWriter {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async listOpenRequests(tenantId: string, contactId: string): Promise<OpenRequest[]> {
    const { data, error } = await this.db
      .from("requests")
      .select("id,title,status,amount")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(`No se pudieron leer solicitudes abiertas: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as "pending" | "in_progress",
      amount: row.amount,
    }));
  }

  async apply(input: RequestWriteInput): Promise<void> {
    if (input.action === "create") {
      const { error } = await this.db.from("requests").insert({
        tenant_id: input.tenantId,
        contact_id: input.contactId,
        conversation_id: input.conversationId,
        title: input.title,
        status: input.status,
        amount: input.amount,
        source: "ai",
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(`No se pudo crear la solicitud: ${error.message}`);
      return;
    }

    if (!input.requestId) throw new Error("requestId requerido para actualizar solicitud");
    const { error } = await this.db
      .from("requests")
      .update({
        status: input.status,
        amount: input.amount,
        conversation_id: input.conversationId,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.requestId);
    if (error) throw new Error(`No se pudo actualizar la solicitud: ${error.message}`);
  }
}
