"use client";

import { useEffect, useRef, useState } from "react";

import { formatDayKey, formatDayLabel } from "@/components/format";
import { CallCard, type CallCardData } from "@/components/molecules/CallCard";
import { CallReportPanel } from "@/components/molecules/CallReportPanel";
import { ContactPanel } from "@/components/molecules/ContactPanel";
import { EmptyState } from "@/components/molecules/EmptyState";
import { MessageBubble } from "@/components/molecules/MessageBubble";
import { TimelineFilterTabs } from "@/components/molecules/TimelineFilterTabs";
import type { TimelineFilter } from "@/modules/conversations";

import { CallSession } from "./CallSession";
import { ConversationList, type StatusFilter } from "./ConversationList";
import type {
  CallSessionData,
  ConversationListItem,
  ContactPanelData,
  InboxTimelineItem,
  MessagePageResult,
} from "./inbox-types";

export type { InboxTimelineItem } from "./inbox-types";

export interface InboxViewProps {
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
  loadMoreConversations: (cursor: string) => Promise<{
    items: ConversationListItem[];
    nextCursor: string | null;
    error?: "invalid-cursor";
  }>;
  loadOlderMessages: (conversationId: string, cursor: string) => Promise<MessagePageResult>;
  loadCallSession: (
    callId: string,
  ) => Promise<
    { ok: true; data: CallSessionData } | { ok: false; error: "not-found" | "load-failed" }
  >;
}

type MobilePane = "list" | "chat" | "details";

type SessionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; callId: string; data: CallSessionData };

/** Bandeja de tres paneles. En móvil se muestra un panel a la vez, con vuelta atrás. */
export function InboxView({
  items,
  nextConversationCursor,
  selectedId,
  selectedName,
  messages,
  calls,
  messagesNextCursor,
  contact,
  filter,
  query,
  status,
  loadMoreConversations,
  loadOlderMessages,
  loadCallSession,
}: InboxViewProps) {
  const [mobilePane, setMobilePane] = useState<MobilePane>(selectedId ? "chat" : "list");
  const [filterState, setFilterState] = useState({ source: filter, value: filter });
  const [selectedCall, setSelectedCall] = useState<CallCardData | null>(null);
  const [session, setSession] = useState<SessionState>({ status: "idle" });
  const [showSession, setShowSession] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const previousPane = useRef<MobilePane>(mobilePane);
  const sessionRequest = useRef<string | null>(null);

  // Si la navegación cambia la conversación, se cierran reporte y transcripción.
  const [activeConversation, setActiveConversation] = useState(selectedId);
  if (activeConversation !== selectedId) {
    setActiveConversation(selectedId);
    setSelectedCall(null);
    setShowSession(false);
    setSession({ status: "idle" });
  }

  // Si la navegación cambia el filtro de la URL (p. ej. el enlace del sidebar),
  // se reajusta el estado local durante el render, sin un effect adicional.
  if (filterState.source !== filter) {
    setFilterState({ source: filter, value: filter });
  }
  const activeFilter = filterState.value;

  // Al cambiar de panel en móvil, el foco va al panel destino (no al botón oculto).
  useEffect(() => {
    if (previousPane.current === mobilePane) {
      return;
    }
    previousPane.current = mobilePane;
    const target =
      mobilePane === "chat"
        ? chatRef.current
        : mobilePane === "details"
          ? detailsRef.current
          : listRef.current;
    target?.focus();
  }, [mobilePane]);

  function handleFilterChange(next: TimelineFilter) {
    setFilterState({ source: filter, value: next });
    // Refleja el filtro en la URL sin pedir otro render al servidor.
    const url = new URL(window.location.href);
    url.searchParams.set("filter", next);
    window.history.replaceState(null, "", url);
  }

  function handleSelectCall(call: CallCardData) {
    setSelectedCall(call);
    setShowSession(false);
    setMobilePane("details");
  }

  async function handleViewSession() {
    const call = selectedCall;
    if (!call) {
      return;
    }

    setShowSession(true);
    setMobilePane("chat");
    if (session.status === "ready" && session.callId === call.id) {
      return;
    }

    sessionRequest.current = call.id;
    setSession({ status: "loading" });
    try {
      const result = await loadCallSession(call.id);
      if (sessionRequest.current !== call.id) {
        return;
      }
      setSession(
        result.ok ? { status: "ready", callId: call.id, data: result.data } : { status: "error" },
      );
    } catch {
      if (sessionRequest.current === call.id) {
        setSession({ status: "error" });
      }
    }
  }

  function handleClearCall() {
    setSelectedCall(null);
    setShowSession(false);
    setSession({ status: "idle" });
    setMobilePane("chat");
  }

  return (
    <div className="grid min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)] lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_minmax(14rem,16rem)]">
      <div
        ref={listRef}
        tabIndex={-1}
        className={`min-h-0 rounded-lg border border-border bg-card outline-none ${
          mobilePane === "list" ? "flex" : "hidden"
        } md:flex`}
      >
        <ConversationList
          items={items}
          nextCursor={nextConversationCursor}
          selectedId={selectedId}
          initialQuery={query}
          initialStatus={status}
          filter={activeFilter}
          loadMore={loadMoreConversations}
          onSelect={() => setMobilePane("chat")}
        />
      </div>

      <section
        ref={chatRef}
        tabIndex={-1}
        aria-label={showSession ? "Transcripción de la llamada" : "Conversación"}
        className={`min-h-0 flex-col rounded-lg border border-border bg-card outline-none ${
          mobilePane === "details"
            ? "hidden md:hidden lg:flex"
            : mobilePane === "chat"
              ? "flex md:flex lg:flex"
              : "hidden md:flex lg:flex"
        }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobilePane("list")}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              Volver a chats
            </button>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {showSession ? "Transcripción" : (selectedName ?? "Selecciona una conversación")}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showSession ? (
              <button
                type="button"
                onClick={() => setShowSession(false)}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Volver a la conversación
              </button>
            ) : null}
            {selectedId && !showSession ? (
              <TimelineFilterTabs active={activeFilter} onChange={handleFilterChange} />
            ) : null}
            {selectedId && !showSession ? (
              <button
                type="button"
                onClick={() => setMobilePane("details")}
                className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                Detalles
              </button>
            ) : null}
          </div>
        </header>

        {showSession ? (
          <CallSession
            state={
              session.status === "ready"
                ? session
                : session.status === "error"
                  ? { status: "error" }
                  : { status: "loading" }
            }
          />
        ) : !selectedId ? (
          <EmptyState message="Selecciona una conversación para ver sus mensajes y llamadas." />
        ) : (
          <ConversationPane
            key={selectedId}
            selectedId={selectedId}
            selectedName={selectedName ?? ""}
            messages={messages}
            calls={calls}
            messagesNextCursor={messagesNextCursor}
            filter={activeFilter}
            selectedCallId={selectedCall?.id ?? null}
            onSelectCall={handleSelectCall}
            loadOlderMessages={loadOlderMessages}
          />
        )}
      </section>

      <div
        ref={detailsRef}
        tabIndex={-1}
        className={`min-h-0 outline-none ${mobilePane === "details" ? "block" : "hidden"} lg:block`}
      >
        {selectedCall ? (
          <CallReportPanel
            call={selectedCall}
            loading={session.status === "loading"}
            viewing={showSession}
            onViewSession={handleViewSession}
            onClear={handleClearCall}
            onClose={() => setMobilePane("chat")}
          />
        ) : (
          <ContactPanel contact={contact} onClose={() => setMobilePane("chat")} />
        )}
      </div>
    </div>
  );
}

function ConversationPane({
  selectedId,
  selectedName,
  messages,
  calls,
  messagesNextCursor,
  filter,
  selectedCallId,
  onSelectCall,
  loadOlderMessages,
}: {
  selectedId: string;
  selectedName: string;
  messages: InboxTimelineItem[];
  calls: InboxTimelineItem[];
  messagesNextCursor: string | null;
  filter: TimelineFilter;
  selectedCallId: string | null;
  onSelectCall: (call: CallCardData) => void;
  loadOlderMessages: (conversationId: string, cursor: string) => Promise<MessagePageResult>;
}) {
  const [olderMessages, setOlderMessages] = useState<InboxTimelineItem[]>([]);
  const [knownMessages, setKnownMessages] = useState(messages);
  const [cursor, setCursor] = useState(messagesNextCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousLatest = useRef(messages.at(-1)?.id ?? null);

  // Un refresh de realtime renueva la primera página. Los mensajes que salen de
  // ella por el desplazamiento se conservan como página antigua para no dejar huecos.
  if (knownMessages !== messages) {
    const currentKeys = new Set(messages.map(entryKey));
    const dropped = knownMessages.filter((entry) => !currentKeys.has(entryKey(entry)));
    setKnownMessages(messages);
    if (dropped.length > 0) {
      setOlderMessages((current) => mergeEntries(dropped, current));
    }
  }

  const allMessages = mergeEntries(messages, olderMessages);
  const allEntries = mergeEntries(allMessages, calls);
  const visible = allEntries.filter((entry) =>
    filter === "messages"
      ? entry.type === "message"
      : filter === "calls"
        ? entry.type === "call"
        : true,
  );
  const groups = groupByDay(visible);

  useEffect(() => {
    const latest = messages.at(-1)?.id ?? null;
    if (previousLatest.current !== null && latest !== null && latest !== previousLatest.current) {
      setAnnouncement(
        `Hay mensajes nuevos en la conversación con ${selectedName || "el contacto"}.`,
      );
    }
    previousLatest.current = latest;
  }, [messages, selectedName]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container && stickToBottom.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [allEntries.length]);

  async function handleLoadOlder() {
    if (!cursor || loadingOlder) {
      return;
    }
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;

    stickToBottom.current = false;
    setLoadingOlder(true);
    setLoadError(false);
    try {
      const page = await loadOlderMessages(selectedId, cursor);
      if (page.error) {
        setLoadError(true);
        return;
      }
      setOlderMessages((current) => mergeEntries(page.items, current));
      setCursor(page.nextCursor);
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = previousTop + (container.scrollHeight - previousHeight);
        }
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    stickToBottom.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  }

  if (allEntries.length === 0) {
    return <EmptyState message="No hay mensajes ni llamadas con este filtro." />;
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto p-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {cursor ? (
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={handleLoadOlder}
            disabled={loadingOlder}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loadingOlder ? "Cargando…" : "Cargar anteriores"}
          </button>
        </div>
      ) : null}

      {loadError ? (
        <p role="alert" className="mb-3 text-center text-xs text-destructive">
          No se pudieron cargar los mensajes anteriores.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay mensajes ni llamadas con este filtro.
        </p>
      ) : (
        <ol className="space-y-2">
          {groups.map((group) => (
            <li key={group.key}>
              <p className="my-3 flex items-center justify-center">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {group.label}
                </span>
              </p>
              <ol className="space-y-2">
                {group.entries.map((entry) =>
                  entry.type === "message" ? (
                    <MessageBubble key={`message-${entry.id}`} message={entry} />
                  ) : (
                    <CallCard
                      key={`call-${entry.id}`}
                      call={entry}
                      selected={entry.id === selectedCallId}
                      onSelect={onSelectCall}
                    />
                  ),
                )}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Agrupa entradas por día en la zona del negocio, conservando el orden ascendente. */
function groupByDay(
  entries: InboxTimelineItem[],
): { key: string; label: string; entries: InboxTimelineItem[] }[] {
  const groups: { key: string; label: string; entries: InboxTimelineItem[] }[] = [];
  for (const entry of entries) {
    const at = entryTime(entry);
    const key = formatDayKey(at);
    const last = groups.at(-1);
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, label: formatDayLabel(at), entries: [entry] });
    }
  }
  return groups;
}

/** Mezcla entradas por tipo+id y ordena de antiguo a nuevo. */
function mergeEntries(...lists: InboxTimelineItem[][]): InboxTimelineItem[] {
  const seen = new Set<string>();
  const merged: InboxTimelineItem[] = [];
  for (const entry of lists.flat()) {
    const key = entryKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }
  return merged.sort((a, b) => entryTime(a).localeCompare(entryTime(b)));
}

function entryKey(entry: InboxTimelineItem): string {
  return `${entry.type}-${entry.id}`;
}

function entryTime(entry: InboxTimelineItem): string {
  return entry.type === "message" ? entry.at : entry.startedAt;
}
