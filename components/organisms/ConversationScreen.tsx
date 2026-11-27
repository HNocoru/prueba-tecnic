import { ErrorState } from "@/components/molecules/ErrorState";
import { composeInbox } from "@/modules/conversations/composition";

import {
  toCallItem,
  toContactPanelData,
  toMessageItem,
  type ContactPanelData,
  type InboxTimelineItem,
  type LoadCallSession,
  type LoadOlderMessages,
} from "./inbox-types";
import { InboxView } from "./InboxView";

type ThreadData =
  | { state: "not-found" }
  | {
      state: "ok";
      selectedId: string;
      selectedName: string;
      messages: InboxTimelineItem[];
      calls: InboxTimelineItem[];
      messagesNextCursor: string | null;
      contact: ContactPanelData;
    };

/** Solo obtiene datos del hilo y del contacto; los errores de acceso se propagan. */
async function loadThreadData(conversationId: string): Promise<ThreadData> {
  const { getConversation, listMessages, listCalls, listContactRequests } = await composeInbox();

  // La conversación se resuelve por id (no por la lista), así que sirve para cualquier
  // enlace directo. Mensajes y llamadas son independientes: una sola ola en paralelo.
  const [selected, messagePage, calls] = await Promise.all([
    getConversation.execute(conversationId),
    listMessages.execute(conversationId),
    listCalls.execute(conversationId),
  ]);
  if (!selected) {
    return { state: "not-found" };
  }

  const messages = messagePage.items.map(toMessageItem);
  const requests = await listContactRequests.execute(selected.contact.id);

  return {
    state: "ok",
    selectedId: selected.conversation.id,
    selectedName: selected.contact.name?.trim() || selected.contact.waId,
    messages,
    calls: calls.map(toCallItem),
    messagesNextCursor: messagePage.nextCursor,
    contact: toContactPanelData(
      selected,
      requests,
      messages.length,
      Boolean(messagePage.nextCursor),
      calls.length,
    ),
  };
}

/**
 * Hilo y panel de contacto de la conversación elegida. Es lo único que se vuelve a
 * cargar al cambiar de contacto: la lista vive en el layout.
 * Los valores de request se esperan aquí, dentro del Suspense de la página.
 */
export async function ConversationScreen({
  params,
  loadOlderMessages,
  loadCallSession,
}: {
  params: Promise<{ conversationId: string }>;
  loadOlderMessages: LoadOlderMessages;
  loadCallSession: LoadCallSession;
}) {
  const { conversationId } = await params;
  let data: ThreadData | undefined;
  try {
    data = await loadThreadData(conversationId);
  } catch {
    // Sin JSX dentro de try/catch: el error se traduce en estado de la pantalla.
  }

  if (!data) {
    return <ErrorState message="No se pudo cargar la bandeja. Inténtalo de nuevo." />;
  }
  if (data.state === "not-found") {
    return <ErrorState message="No encontramos esa conversación." />;
  }

  return (
    <InboxView
      selectedId={data.selectedId}
      selectedName={data.selectedName}
      messages={data.messages}
      calls={data.calls}
      messagesNextCursor={data.messagesNextCursor}
      contact={data.contact}
      loadOlderMessages={loadOlderMessages}
      loadCallSession={loadCallSession}
    />
  );
}
