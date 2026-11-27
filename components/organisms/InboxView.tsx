"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDayKey, formatDayLabel } from "@/components/format";
import { CallCard, type CallCardData } from "@/components/molecules/CallCard";
import { CallReportPanel } from "@/components/molecules/CallReportPanel";
import { ContactPanel } from "@/components/molecules/ContactPanel";
import { EmptyState } from "@/components/molecules/EmptyState";
import { MessageBubble } from "@/components/molecules/MessageBubble";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import { TimelineFilterTabs } from "@/components/molecules/TimelineFilterTabs";
import type { TimelineFilter } from "@/modules/conversations";

import { CallWindow, type CallWindowView } from "./CallWindow";
import { INBOX_AI_FOOTER } from "./inbox-copy";
import { useInboxPanes } from "./InboxShell";
import type {
  CallSessionData,
  CallWindowSessionState,
  ContactPanelData,
  InboxTimelineItem,
  MessagePageResult,
} from "./inbox-types";

export type { InboxTimelineItem } from "./inbox-types";

export interface InboxViewProps {
  selectedId?: string;
  selectedName?: string;
  messages: InboxTimelineItem[];
  calls: InboxTimelineItem[];
  messagesNextCursor: string | null;
  contact: ContactPanelData | null;
  loadOlderMessages: (conversationId: string, cursor: string) => Promise<MessagePageResult>;
  loadCallSession: (
    callId: string,
  ) => Promise<
    { ok: true; data: CallSessionData } | { ok: false; error: "not-found" | "load-failed" }
  >;
}

const FALLBACK_CALL: CallCardData = {
  id: "",
  startedAt: "1970-01-01T00:00:00.000Z",
  endedAt: null,
  durationSeconds: null,
  outcome: null,
  summary: null,
};

type SessionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; callId: string; data: CallSessionData };

/**
 * Hilo y panel de contacto de la bandeja. La lista vive en el layout (`InboxShell`) y
 * no se vuelve a montar al cambiar de conversación; esta vista sí se recarga.
 * En móvil se muestra un panel a la vez, con vuelta atrás.
 */
export function InboxView({
  selectedId,
  selectedName,
  messages,
  calls,
  messagesNextCursor,
  contact,
  loadOlderMessages,
  loadCallSession,
}: InboxViewProps) {
  const {
    mobilePane,
    setMobilePane,
    timelineFilter: activeFilter,
    setTimelineFilter,
  } = useInboxPanes();
  const [selectedCall, setSelectedCall] = useState<CallCardData | null>(null);
  const [session, setSession] = useState<SessionState>({ status: "idle" });
  const [showSession, setShowSession] = useState(false);
  const [callView, setCallView] = useState<CallWindowView>("transcript");

  const chatRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const sessionRequest = useRef<string | null>(null);

  // Si la navegación cambia la conversación, se cierran reporte y transcripción.
  const [activeConversation, setActiveConversation] = useState(selectedId);
  if (activeConversation !== selectedId) {
    setActiveConversation(selectedId);
    setSelectedCall(null);
    setShowSession(false);
    setCallView("transcript");
    setSession({ status: "idle" });
  }

  const callWindowState: CallWindowSessionState =
    session.status === "idle"
      ? { status: "idle" }
      : session.status === "ready"
        ? { status: "ready", data: session.data }
        : session.status === "error"
          ? { status: "error" }
          : { status: "loading" };

  // Al abrir o cambiar de conversación en móvil, el foco va al panel visible,
  // incluso cuando la navegación remonta la vista con `mobilePane` ya en "chat".
  useEffect(() => {
    // El foco de la lista lo gestiona InboxShell, que es quien la monta.
    const target =
      mobilePane === "chat"
        ? chatRef.current
        : mobilePane === "details"
          ? detailsRef.current
          : null;
    target?.focus({ preventScroll: true });
  }, [mobilePane, selectedId]);

  const closeCallWindow = useCallback(() => setShowSession(false), []);

  function handleFilterChange(next: TimelineFilter) {
    setTimelineFilter(next);
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
    setCallView("transcript");
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
    setCallView("transcript");
    setSession({ status: "idle" });
    setMobilePane("chat");
  }

  return (
    <>
      <section
        ref={chatRef}
        tabIndex={-1}
        aria-label="Conversación"
        className={`min-h-0 flex-col rounded-lg border border-border bg-card outline-none ${
          mobilePane === "details"
            ? "hidden md:hidden xl:flex"
            : mobilePane === "chat"
              ? "flex md:flex xl:flex"
              : "hidden md:flex xl:flex"
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
              {selectedName ?? "Selecciona una conversación"}
            </h2>
            {contact ? <StatusBadge status={contact.status} /> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedId ? (
              <TimelineFilterTabs active={activeFilter} onChange={handleFilterChange} />
            ) : null}
            {selectedId ? (
              <button
                type="button"
                onClick={() => setMobilePane("details")}
                className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
              >
                Detalles
              </button>
            ) : null}
          </div>
        </header>

        {!selectedId ? (
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

        <footer className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
          >
            <path d="M12 3a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4Z" />
            <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3" />
          </svg>
          <span>{INBOX_AI_FOOTER}</span>
        </footer>
      </section>

      <div
        ref={detailsRef}
        tabIndex={-1}
        className={`min-h-0 outline-none ${
          mobilePane === "details"
            ? "block md:absolute md:inset-0 md:z-20 md:rounded-lg md:bg-card xl:static xl:z-auto"
            : "hidden"
        } xl:block`}
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

      <CallWindow
        open={showSession}
        call={selectedCall ?? FALLBACK_CALL}
        state={callWindowState}
        view={callView}
        onViewChange={setCallView}
        onClose={closeCallWindow}
      />
    </>
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
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      role="region"
      aria-label="Historial de la conversación"
      className="min-h-0 flex-1 overflow-y-auto p-4"
    >
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
