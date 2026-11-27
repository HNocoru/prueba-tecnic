import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import type { TimelineEntry, TimelineFilter } from "@/modules/conversations";
import { composeInbox } from "@/modules/conversations/composition";

import type { ContactPanelData } from "../molecules/ContactPanel";
import type { ConversationListItem } from "./ConversationList";
import { InboxRealtime } from "./InboxRealtime";
import { InboxView, type InboxTimelineItem } from "./InboxView";

type SearchParams = Record<string, string | string[] | undefined>;

type InboxData =
  | { state: "empty" }
  | { state: "not-found" }
  | {
      state: "ok";
      items: ConversationListItem[];
      selectedId?: string;
      selectedName?: string;
      timeline: InboxTimelineItem[];
      contact: ContactPanelData | null;
      filter: TimelineFilter;
      query: string;
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

function toTimelineItem(entry: TimelineEntry): InboxTimelineItem {
  return entry.type === "message"
    ? {
        type: "message",
        id: entry.id,
        direction: entry.direction,
        messageKind: entry.kind,
        body: entry.body,
        mediaPath: entry.mediaPath,
        transcript: entry.transcript,
        at: entry.at,
      }
    : {
        type: "call",
        id: entry.id,
        startedAt: entry.startedAt,
        durationSeconds: entry.durationSeconds,
        outcome: entry.outcome,
        summary: entry.summary,
      };
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

  const { listConversations, getTimeline } = await composeInbox();
  const summaries = await listConversations.execute();

  if (summaries.length === 0) {
    return { state: "empty" };
  }

  const selected = conversationId
    ? summaries.find((summary) => summary.conversation.id === conversationId)
    : undefined;

  if (conversationId && !selected) {
    return { state: "not-found" };
  }

  // Una sola consulta del timeline completo; el filtro y los conteos salen en memoria.
  let allEntries: InboxTimelineItem[] = [];
  if (selected) {
    allEntries = (await getTimeline.execute(selected.conversation.id, "all")).map(toTimelineItem);
  }
  const timeline = allEntries.filter((entry) =>
    filter === "messages"
      ? entry.type === "message"
      : filter === "calls"
        ? entry.type === "call"
        : true,
  );

  const items: ConversationListItem[] = summaries.map((summary) => ({
    id: summary.conversation.id,
    name: summary.contact.name?.trim() || summary.contact.waId,
    phone: summary.contact.phoneE164 ?? summary.contact.waId,
    preview: summary.lastMessage
      ? (summary.lastMessage.body ?? summary.lastMessage.transcript ?? summary.lastMessage.kind)
      : "Sin mensajes",
    lastActivityAt: summary.conversation.lastActivityAt,
  }));

  if (!selected) {
    // La lista ya está lista; el panel central pide al usuario que elija una conversación.
    return { state: "ok", items, timeline: [], contact: null, filter, query };
  }

  const selectedName = selected.contact.name?.trim() || selected.contact.waId;
  return {
    state: "ok",
    items,
    selectedId: selected.conversation.id,
    selectedName,
    timeline,
    contact: {
      name: selectedName,
      phone: selected.contact.phoneE164 ?? selected.contact.waId,
      firstSeenAt: selected.contact.createdAt,
      messageCount: allEntries.filter((entry) => entry.type === "message").length,
      callCount: allEntries.filter((entry) => entry.type === "call").length,
    },
    filter,
    query,
  };
}

/**
 * Carga los datos de la bandeja desde el módulo conversations y los pasa a la UI.
 * Los valores de request se esperan aquí, dentro del Suspense de la página.
 */
export async function InboxScreen({
  params,
  searchParams,
}: {
  params?: Promise<{ conversationId: string }>;
  searchParams?: Promise<SearchParams>;
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
        selectedId={data.selectedId}
        selectedName={data.selectedName}
        timeline={data.timeline}
        contact={data.contact}
        filter={data.filter}
        query={data.query}
      />
    </>
  );
}
