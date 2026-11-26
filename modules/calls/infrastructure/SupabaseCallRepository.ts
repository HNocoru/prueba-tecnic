import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db";

import type { CallRepository, CallWebhookRepository } from "../application/ports";
import type {
  CallContextData,
  CallTurnInput,
  CallWebhookEvent,
  EndCallInput,
  StoredCall,
} from "../domain/Call";

const RECENT_TURNS_LIMIT = 12;

/**
 * Adaptador de Supabase con service_role (se salta la RLS): cada consulta lleva
 * tenant_id explícito, resuelto antes por la app y nunca tomado de la entrada.
 */
export class SupabaseCallRepository implements CallRepository, CallWebhookRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findCall(callId: string): Promise<StoredCall | null> {
    const { data, error } = await this.db
      .from("calls")
      .select("id, tenant_id, conversation_id, started_at, ended_at")
      .eq("id", callId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la llamada: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      tenantId: data.tenant_id,
      conversationId: data.conversation_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
    };
  }

  async loadContext(tenantId: string, call: StoredCall): Promise<CallContextData> {
    const [tenant, assistant, conversation, recent] = await Promise.all([
      this.db.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      this.db
        .from("assistant_configs")
        .select("tone, voice, language")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      this.db
        .from("conversations")
        .select("contact_id")
        .eq("tenant_id", tenantId)
        .eq("id", call.conversationId)
        .maybeSingle(),
      this.db
        .from("messages")
        .select("direction, body, transcript, occurred_at")
        .eq("tenant_id", tenantId)
        .eq("conversation_id", call.conversationId)
        .order("occurred_at", { ascending: false })
        .limit(RECENT_TURNS_LIMIT),
    ]);

    if (tenant.error) throw new Error(`No se pudo leer el negocio: ${tenant.error.message}`);
    if (assistant.error)
      throw new Error(`No se pudo leer el asistente: ${assistant.error.message}`);
    if (conversation.error)
      throw new Error(`No se pudo leer la conversación: ${conversation.error.message}`);
    if (recent.error) throw new Error(`No se pudieron leer los turnos: ${recent.error.message}`);

    let displayName: string | null = null;
    let isNew = true;
    if (conversation.data) {
      const contact = await this.db
        .from("contacts")
        .select("name, created_at")
        .eq("tenant_id", tenantId)
        .eq("id", conversation.data.contact_id)
        .maybeSingle();
      if (contact.error) throw new Error(`No se pudo leer el contacto: ${contact.error.message}`);
      if (contact.data) {
        displayName = contact.data.name;
        isNew = Date.parse(contact.data.created_at) >= Date.parse(call.startedAt);
      }
    }

    return {
      business: {
        // Deuda: modules/business no existe todavía; nombre, tono y voz salen de
        // tenants/assistant_configs. faq y hours quedan vacíos hasta el slice 08.
        name: tenant.data?.name ?? "",
        tone: assistant.data?.tone ?? "",
        faq: "",
        hours: "",
        voice: assistant.data?.voice ?? "roberto",
        language: assistant.data?.language ?? "es",
      },
      contact: { displayName, isNew },
      recentTurns: [...(recent.data ?? [])].reverse().map((message) => ({
        role: message.direction === "inbound" ? "user" : "assistant",
        channel: "text",
        text: message.body ?? message.transcript ?? "",
        at: message.occurred_at,
      })),
    };
  }

  async insertTurns(tenantId: string, callId: string, turns: CallTurnInput[]): Promise<void> {
    // call_turns no tiene UNIQUE(call_id, position): se filtran los seq ya guardados
    // antes de insertar. Deuda: una migración debe añadir esa restricción.
    const { data: existing, error: readError } = await this.db
      .from("call_turns")
      .select("position")
      .eq("tenant_id", tenantId)
      .eq("call_id", callId);
    if (readError) throw new Error(`No se pudieron leer los turnos: ${readError.message}`);

    const seen = new Set((existing ?? []).map((row) => row.position));
    const rows = turns
      .filter((turn) => !seen.has(turn.seq))
      .map((turn) => ({
        tenant_id: tenantId,
        call_id: callId,
        role: turn.role,
        text: turn.text,
        position: turn.seq,
      }));
    if (rows.length === 0) return;

    const { error } = await this.db.from("call_turns").insert(rows);
    if (error) throw new Error(`No se pudieron guardar los turnos: ${error.message}`);
  }

  async markEnded(tenantId: string, callId: string, input: EndCallInput): Promise<void> {
    // Deuda: calls no tiene columna para el error del worker; se descarta.
    const { error } = await this.db
      .from("calls")
      .update({
        ended_at: input.endedAt,
        duration_seconds: input.durationSec,
        outcome: input.endedReason,
      })
      .eq("tenant_id", tenantId)
      .eq("id", callId);
    if (error) throw new Error(`No se pudo cerrar la llamada: ${error.message}`);
  }

  async startCall(tenantId: string, event: CallWebhookEvent): Promise<void> {
    if (!event.waId) throw new Error("La llamada no trae wa_id del contacto");
    const occurredAt = event.occurredAt.toISOString();

    const { data: contact, error: contactError } = await this.db
      .from("contacts")
      .upsert({ tenant_id: tenantId, wa_id: event.waId }, { onConflict: "tenant_id,wa_id" })
      .select("id")
      .single();
    if (contactError) throw new Error(`No se pudo guardar el contacto: ${contactError.message}`);

    const { data: conversation, error: conversationError } = await this.db
      .from("conversations")
      .upsert(
        { tenant_id: tenantId, contact_id: contact.id, last_activity_at: occurredAt },
        { onConflict: "tenant_id,contact_id" },
      )
      .select("id")
      .single();
    if (conversationError)
      throw new Error(`No se pudo guardar la conversación: ${conversationError.message}`);

    // wa_call_id es único: un reintento de Meta no crea otra fila.
    const { error: callError } = await this.db.from("calls").upsert(
      {
        tenant_id: tenantId,
        conversation_id: conversation.id,
        wa_call_id: event.waCallId,
        started_at: occurredAt,
      },
      { onConflict: "wa_call_id", ignoreDuplicates: true },
    );
    if (callError) throw new Error(`No se pudo crear la llamada: ${callError.message}`);
  }

  async endCall(tenantId: string, waCallId: string, at: Date): Promise<void> {
    const { data, error } = await this.db
      .from("calls")
      .select("id, started_at, ended_at")
      .eq("tenant_id", tenantId)
      .eq("wa_call_id", waCallId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer la llamada: ${error.message}`);
    if (!data || data.ended_at) return;

    const durationSeconds = Math.max(
      0,
      Math.round((at.getTime() - Date.parse(data.started_at)) / 1000),
    );
    const { error: updateError } = await this.db
      .from("calls")
      .update({
        ended_at: at.toISOString(),
        duration_seconds: durationSeconds,
        // El worker puede corregir el motivo con /end; esto es el cierre best-effort del webhook.
        outcome: "caller_hangup",
      })
      .eq("tenant_id", tenantId)
      .eq("id", data.id);
    if (updateError) throw new Error(`No se pudo cerrar la llamada: ${updateError.message}`);
  }
}
