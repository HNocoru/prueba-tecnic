import type { CallCardData } from "@/components/molecules/CallCard";
import type { ContactPanelData } from "@/components/molecules/ContactPanel";
import type { MessageBubbleData } from "@/components/molecules/MessageBubble";
import type {
  CallDetail,
  CallEntry,
  ContactRequest,
  ConversationSummary,
  MessageEntry,
  RequestStatus,
} from "@/modules/conversations";

export type { ContactPanelData } from "@/components/molecules/ContactPanel";

export interface ConversationListItem {
  id: string;
  name: string;
  phone: string;
  preview: string;
  lastActivityAt: string;
  status: RequestStatus;
}

export interface ContactRequestItem {
  id: string;
  title: string;
  status: RequestStatus;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallTurnItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  position: number;
}

export interface CallSessionData {
  call: CallCardData;
  turns: CallTurnItem[];
}

export type CallSessionResult =
  { ok: true; data: CallSessionData } | { ok: false; error: "not-found" | "load-failed" };

export type InboxTimelineItem =
  ({ type: "message" } & MessageBubbleData) | ({ type: "call" } & CallCardData);

export type LoadMoreConversations = (cursor: string) => Promise<ConversationPageResult>;
export type LoadOlderMessages = (
  conversationId: string,
  cursor: string,
) => Promise<MessagePageResult>;
export type LoadCallSession = (callId: string) => Promise<CallSessionResult>;

export type ConversationPageResult = {
  items: ConversationListItem[];
  nextCursor: string | null;
  error?: "invalid-cursor";
};

export type MessagePageResult = {
  items: InboxTimelineItem[];
  nextCursor: string | null;
  error?: "invalid-cursor";
};

export function toConversationItem(summary: ConversationSummary): ConversationListItem {
  return {
    id: summary.conversation.id,
    name: summary.contact.name?.trim() || summary.contact.waId,
    phone: summary.contact.phoneE164 ?? summary.contact.waId,
    preview: summary.lastMessage
      ? (summary.lastMessage.body ?? summary.lastMessage.transcript ?? summary.lastMessage.kind)
      : "Sin mensajes",
    lastActivityAt: summary.conversation.lastActivityAt,
    status: summary.latestRequest?.status ?? "none",
  };
}

export function toMessageItem(entry: MessageEntry): InboxTimelineItem {
  return {
    type: "message",
    id: entry.id,
    direction: entry.direction,
    messageKind: entry.kind,
    body: entry.body,
    mediaPath: entry.mediaPath,
    transcript: entry.transcript,
    at: entry.at,
  };
}

export function toCallItem(entry: CallEntry): InboxTimelineItem {
  return {
    type: "call",
    id: entry.id,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    durationSeconds: entry.durationSeconds,
    outcome: entry.outcome,
    summary: entry.summary,
  };
}

export function toContactPanelData(
  summary: ConversationSummary,
  requests: readonly ContactRequest[],
  messageCount: number,
  messagesPartial: boolean,
  callCount: number,
): ContactPanelData {
  return {
    name: summary.contact.name?.trim() || summary.contact.waId,
    phone: summary.contact.phoneE164 ?? summary.contact.waId,
    firstSeenAt: summary.contact.createdAt,
    messageCount,
    messagesPartial,
    callCount,
    status: summary.latestRequest?.status ?? "none",
    requests: requests.map(toRequestItem),
  };
}

export function toRequestItem(request: ContactRequest): ContactRequestItem {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    amount: request.amount,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function toCallSessionData(detail: CallDetail): CallSessionData {
  return {
    call: {
      id: detail.call.id,
      startedAt: detail.call.startedAt,
      endedAt: detail.call.endedAt,
      durationSeconds: detail.call.durationSeconds,
      outcome: detail.call.outcome,
      summary: detail.call.summary,
    },
    turns: detail.turns.map((turn) => ({
      id: turn.id,
      role: turn.role,
      text: turn.text,
      position: turn.position,
    })),
  };
}
