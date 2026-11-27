"use server";

import {
  toCallItem,
  toCallSessionData,
  toConversationItem,
  toMessageItem,
  type CallSessionResult,
  type ConversationPageResult,
  type MessagePageResult,
} from "@/components/organisms/inbox-types";
import { InvalidCursorError } from "@/modules/conversations";
import { composeInbox } from "@/modules/conversations/composition";

/**
 * Entradas delgadas: resuelven el tenant de la sesión, delegan en el caso de uso y
 * traducen el cursor inválido a un resultado vacío para la UI.
 */
export async function loadMoreConversationsAction(cursor: string): Promise<ConversationPageResult> {
  const { listConversations } = await composeInbox();

  try {
    const page = await listConversations.execute({ cursor });
    return { items: page.items.map(toConversationItem), nextCursor: page.nextCursor };
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return { items: [], nextCursor: null, error: "invalid-cursor" };
    }
    throw error;
  }
}

export async function loadOlderMessagesAction(
  conversationId: string,
  cursor: string,
): Promise<MessagePageResult> {
  const { listMessages } = await composeInbox();

  try {
    const page = await listMessages.execute(conversationId, { cursor });
    return { items: page.items.map(toMessageItem), nextCursor: page.nextCursor };
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return { items: [], nextCursor: null, error: "invalid-cursor" };
    }
    throw error;
  }
}

export async function loadCallSessionAction(callId: string): Promise<CallSessionResult> {
  try {
    const { getCallDetail } = await composeInbox();
    const detail = await getCallDetail.execute(callId);

    if (!detail) {
      return { ok: false, error: "not-found" };
    }

    return { ok: true, data: toCallSessionData(detail) };
  } catch {
    return { ok: false, error: "load-failed" };
  }
}

export { toCallItem };
