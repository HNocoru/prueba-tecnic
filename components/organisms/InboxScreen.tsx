import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { REQUEST_STATUSES, type RequestStatus, type TimelineFilter } from "@/modules/conversations";
import { composeInbox } from "@/modules/conversations/composition";

import type { StatusFilter } from "./ConversationList";
import { InboxRealtime } from "./InboxRealtime";
import {
  toCallItem,
  toContactPanelData,
  toConversationItem,
  toMessageItem,
  type ContactPanelData,
  type ConversationListItem,
  type InboxTimelineItem,
  type LoadCallSession,
  type LoadMoreConversations,
  type LoadOlderMessages,
} from "./inbox-types";
import { InboxView } from "./InboxView";

type SearchParams = Record<string, string | string[] | undefined>;

type InboxData =
  | { state: "empty" }
  | { state: "not-found" }
  | {
      state: "ok";
      items: ConversationListItem[];
      nextConversationCursor: string | null;
      selectedId?: string;
      selectedName?: string;
      messages: InboxTimelineItem[];
      calls: InboxTimelineItem[];
      messagesNextCursor: string | null;
      contact: ContactPanelData | null;
      filter: TimelineFilter;
      query: string;
      status: StatusFilter;
    };

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseFilter(value: string): TimelineFilter {
  return value === "messages" || value === "calls" ? value : "all";
}

function parseStatus(value: string): StatusFilter {
  return REQUEST_STATUSES.includes(value as RequestStatus) ? (value as RequestStatus) : "all";
}

/** Solo obtiene datos; los errores de acceso se propagan al límite de la pantalla. */
async function loadInboxData(
  params?: Promise<{ conversationId: string }>,
  searchParams?: Promise<SearchParams>,
): Promise<InboxData> {
  const resolvedParams = params ? await params : undefined;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const conversationId = resolvedParams?.conversationId;
  const filter = parseFilter(firstParam(resolvedSearchParams.filter));
  const query = firstParam(resolvedSearchParams.q);
  const status = parseStatus(firstParam(resolvedSearchParams.status));

  const { listConversations, getConversation, listMessages, listCalls, listContactRequests } =
    await composeInbox();

  // Lista, últimos mensajes y llamadas son independientes: una sola ola en paralelo.
  const [page, messagePage, calls] = await Promise.all([
    listConversations.execute(),
    conversationId ? listMessages.execute(conversationId) : Promise.resolve(null),
    conversationId ? listCalls.execute(conversationId) : Promise.resolve([]),
  ]);

  let selected = conversationId
    ? page.items.find((summary) => summary.conversation.id === conversationId)
    : undefined;

  // Enlace directo fuera de la primera página: se resuelve por id, no por la lista.
  if (conversationId && !selected) {
    selected = (await getConversation.execute(conversationId)) ?? undefined;
  }

  if (conversationId && !selected) {
    return { state: "not-found" };
  }
  if (!selected && page.items.length === 0) {
    return { state: "empty" };
  }

  const items = page.items.map(toConversationItem);
  if (!selected) {
    return {
      state: "ok",
      items,
      nextConversationCursor: page.nextCursor,
      messages: [],
      calls: [],
      messagesNextCursor: null,
      contact: null,
      filter,
      query,
      status,
    };
  }

  const selectedName = selected.contact.name?.trim() || selected.contact.waId;
  const messages = (messagePage?.items ?? []).map(toMessageItem);
  const requests = await listContactRequests.execute(selected.contact.id);

  return {
    state: "ok",
    items,
    nextConversationCursor: page.nextCursor,
    selectedId: selected.conversation.id,
    selectedName,
    messages,
    calls: calls.map(toCallItem),
    messagesNextCursor: messagePage?.nextCursor ?? null,
    contact: toContactPanelData(
      selected,
      requests,
      messages.length,
      Boolean(messagePage?.nextCursor),
      calls.length,
    ),
    filter,
    query,
    status,
  };
}

/**
 * Carga los datos de la bandeja desde el módulo conversations y los pasa a la UI.
 * Los valores de request se esperan aquí, dentro del Suspense de la página.
 */
export async function InboxScreen({
  params,
  searchParams,
  loadMoreConversations,
  loadOlderMessages,
  loadCallSession,
}: {
  params?: Promise<{ conversationId: string }>;
  searchParams?: Promise<SearchParams>;
  loadMoreConversations: LoadMoreConversations;
  loadOlderMessages: LoadOlderMessages;
  loadCallSession: LoadCallSession;
}) {
  let data: InboxData | undefined;
  try {
    data = await loadInboxData(params, searchParams);
  } catch {
    // Sin JSX dentro de try/catch: el error se traduce en estado de la pantalla.
  }

  if (!data) {
    return <ErrorState message="No se pudo cargar la bandeja. Inténtalo de nuevo." />;
  }
  // El suscriptor vive en todos los estados: el primer mensaje también debe aparecer en vivo.
  if (data.state === "empty") {
    return (
      <>
        <InboxRealtime />
        <EmptyState message="Aún no hay conversaciones. Escribe al WhatsApp del negocio para crear la primera" />
      </>
    );
  }
  if (data.state === "not-found") {
    return <ErrorState message="No encontramos esa conversación." />;
  }

  return (
    <>
      <InboxRealtime />
      <InboxView
        items={data.items}
        nextConversationCursor={data.nextConversationCursor}
        selectedId={data.selectedId}
        selectedName={data.selectedName}
        messages={data.messages}
        calls={data.calls}
        messagesNextCursor={data.messagesNextCursor}
        contact={data.contact}
        filter={data.filter}
        query={data.query}
        status={data.status}
        loadMoreConversations={loadMoreConversations}
        loadOlderMessages={loadOlderMessages}
        loadCallSession={loadCallSession}
      />
    </>
  );
}
