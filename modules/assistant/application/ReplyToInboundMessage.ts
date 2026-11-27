import { buildSystemPrompt } from "./buildSystemPrompt";
import {
  buildRequestClassificationSystem,
  decideRequestWrite,
  parseClassificationOutput,
  toClassificationUserMessage,
} from "./requestClassification";
import type {
  BusinessContextReader,
  ContactMemoryReader,
  ContactMemorySnapshot,
  ConversationHistoryReader,
  ConversationSummaryScheduler,
  InboundMessageReader,
  LlmPort,
  MessageWriter,
  NewMessageCounter,
  RecentCallSummary,
  RecentCallSummariesReader,
  ReplyEventStore,
  RequestWriter,
  WhatsAppSenderPort,
} from "./ports";
import { redactError } from "./redactError";
import { classifyInbound, TEXT_ONLY_REPLY, type ReplyResult } from "../domain/Reply";

/** Tope por conversación y hora; configurable cambiando esta constante. */
export const MAX_REPLIES_PER_HOUR = 20;
export const HISTORY_LIMIT = 12;
export const NEW_MESSAGES_FOR_SUMMARY = 8;
const REPLY_WINDOW_MS = 60 * 60 * 1000;

type Dependencies = {
  inbound: InboundMessageReader;
  business: BusinessContextReader;
  history: ConversationHistoryReader;
  llm: LlmPort;
  sender: WhatsAppSenderPort;
  messages: MessageWriter;
  events: ReplyEventStore;
  requests?: RequestWriter;
  memory?: ContactMemoryReader;
  recentCalls?: RecentCallSummariesReader;
  newMessages?: NewMessageCounter;
  summaryScheduler?: ConversationSummaryScheduler;
};

/**
 * Caso de uso: responder un mensaje entrante nuevo. Nunca lanza: cada fallo se registra
 * en webhook_events.error y se devuelve como resultado para no romper el webhook.
 */
export class ReplyToInboundMessage {
  constructor(private readonly deps: Dependencies) {}

  async execute(
    tenantId: string,
    conversationId: string,
    inboundMessageId: string,
  ): Promise<ReplyResult> {
    try {
      const message = await this.deps.inbound.findInbound(tenantId, inboundMessageId);
      if (!message) return { status: "skipped", reason: "missing" };

      const context = await this.deps.business.getBusinessContext(tenantId);
      const decision = classifyInbound(message, [context.contactPhone]);
      if (!decision.allowed) return { status: "skipped", reason: decision.reason };

      const claimed = await this.deps.events.tryClaim(tenantId, inboundMessageId);
      if (!claimed) return { status: "skipped", reason: "duplicate" };

      const since = new Date(Date.now() - REPLY_WINDOW_MS);
      const sent = await this.deps.messages.countRecentOutbound(tenantId, conversationId, since);
      if (sent >= MAX_REPLIES_PER_HOUR) {
        await this.deps.events.markProcessed(tenantId, inboundMessageId);
        return { status: "skipped", reason: "rate_limited" };
      }

      let body: string;
      let memorySnapshot: ContactMemorySnapshot | null = null;
      let historyForClassification: { role: "user" | "assistant"; body: string }[] = [];
      if (decision.mode === "text_only") {
        body = TEXT_ONLY_REPLY;
      } else {
        const history = await this.deps.history.loadHistory(
          tenantId,
          conversationId,
          HISTORY_LIMIT,
        );
        historyForClassification = [
          ...history,
          { role: "user" as const, body: message.body ?? "" },
        ];
        memorySnapshot = await this.readMemorySafely(tenantId, message.contactId);
        const recent = await this.readRecentSafely(tenantId, message.contactId);
        const system = buildSystemPrompt(context, {
          summary: memorySnapshot?.summary ?? "",
          facts: memorySnapshot?.facts ?? {},
          recentCalls: recent ?? [],
        });
        try {
          body = (await this.deps.llm.generate(system, historyForClassification)).trim();
          if (body.length === 0) throw new Error("respuesta vacía del LLM");
        } catch (error) {
          const detail = `LLM: ${redactError(error)}`;
          await this.deps.events.markFailed(tenantId, inboundMessageId, detail);
          return { status: "failed", reason: "llm", error: detail };
        }
      }

      let wamid: string;
      try {
        wamid = await this.deps.sender.sendText(tenantId, message.waId, body);
      } catch (error) {
        const detail = `Graph: ${redactError(error)}`;
        await this.deps.events.markFailed(tenantId, inboundMessageId, detail);
        return { status: "failed", reason: "send", error: detail };
      }

      try {
        await this.deps.messages.insertOutbound(tenantId, conversationId, {
          body,
          wamid,
          occurredAt: new Date(),
        });
      } catch (error) {
        const detail = `BD: ${redactError(error)}`;
        await this.deps.events.markFailed(tenantId, inboundMessageId, detail);
        return { status: "failed", reason: "storage", error: detail };
      }

      if (decision.mode !== "text_only") {
        await this.scheduleSummary(tenantId, message.contactId, memorySnapshot, [
          ...historyForClassification.map((turn) => ({ role: turn.role, text: turn.body })),
          { role: "assistant" as const, text: body },
        ]);
      }

      await this.classifyAndWriteRequest(tenantId, conversationId, message.contactId, context, [
        ...historyForClassification,
        { role: "assistant" as const, body },
      ]);

      await this.deps.events.markProcessed(tenantId, inboundMessageId);
      return { status: "sent", wamid };
    } catch (error) {
      const detail = `Asistente: ${redactError(error)}`;
      try {
        await this.deps.events.markFailed(tenantId, inboundMessageId, detail);
      } catch {
        // No hay dónde registrar: el webhook ya respondió 200.
      }
      return { status: "failed", reason: "unconfigured", error: detail };
    }
  }

  private async readMemorySafely(
    tenantId: string,
    contactId: string,
  ): Promise<ContactMemorySnapshot | null> {
    if (!this.deps.memory) return null;
    try {
      return await this.deps.memory.read(tenantId, contactId);
    } catch {
      return null;
    }
  }

  private async readRecentSafely(
    tenantId: string,
    contactId: string,
  ): Promise<RecentCallSummary[]> {
    if (!this.deps.recentCalls) return [];
    try {
      return await this.deps.recentCalls.readRecent(tenantId, contactId, 3);
    } catch {
      return [];
    }
  }

  /** Efecto secundario: nunca cambia la respuesta ya enviada ni el estado del webhook. */
  private async scheduleSummary(
    tenantId: string,
    contactId: string,
    snapshot: ContactMemorySnapshot | null,
    turns: { role: "user" | "assistant"; text: string }[],
  ): Promise<void> {
    const scheduler = this.deps.summaryScheduler;
    const counter = this.deps.newMessages;
    if (!scheduler || !counter || !snapshot) return;
    try {
      const since = snapshot.updatedAt ? new Date(snapshot.updatedAt) : new Date(0);
      const count = await counter.countInboundSince(tenantId, contactId, since);
      if (count < NEW_MESSAGES_FOR_SUMMARY) return;
      scheduler.schedule({ tenantId, contactId, turns });
    } catch {
      // Sin memoria no hay respuesta distinta: solo se omite el resumen.
    }
  }

  private async classifyAndWriteRequest(
    tenantId: string,
    conversationId: string,
    contactId: string,
    context: { catalog: { name: string; price: number | null; currency: string }[] } & Parameters<
      typeof buildRequestClassificationSystem
    >[0],
    history: { role: "user" | "assistant"; body: string }[],
  ): Promise<void> {
    const writer = this.deps.requests;
    if (!writer || history.length === 0) return;
    try {
      const openRequests = await writer.listOpenRequests(tenantId, contactId);
      const system = buildRequestClassificationSystem(context, openRequests);
      const raw = await this.deps.llm.generate(system, [
        { role: "user", body: toClassificationUserMessage(history) },
      ]);
      const command = decideRequestWrite(parseClassificationOutput(raw), openRequests, context);
      if (!command) return;
      await writer.apply({
        tenantId,
        contactId,
        conversationId,
        ...command,
      });
    } catch {
      // La clasificación no debe romper la respuesta ya enviada.
    }
  }
}
