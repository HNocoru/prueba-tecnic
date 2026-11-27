"use client";

import { useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { EmptyState } from "@/components/molecules/EmptyState";
import { REQUEST_STATUSES, type RequestStatus, type TimelineFilter } from "@/modules/conversations";

import { ConversationList, type StatusFilter } from "./ConversationList";
import type { ConversationPageResult, ConversationListItem } from "./inbox-types";

export type MobilePane = "list" | "chat" | "details";

interface InboxPanes {
  mobilePane: MobilePane;
  setMobilePane: (pane: MobilePane) => void;
  timelineFilter: TimelineFilter;
  setTimelineFilter: (filter: TimelineFilter) => void;
}

const InboxPanesContext = createContext<InboxPanes | null>(null);

/** Estado compartido entre la lista (layout) y el hilo (página): panel móvil y filtro del hilo. */
export function useInboxPanes(): InboxPanes {
  const value = useContext(InboxPanesContext);
  if (!value) {
    throw new Error("useInboxPanes debe usarse dentro de InboxShell");
  }
  return value;
}

/** Convierte el valor de la URL en filtro del hilo; cualquier otro valor es "all". */
export function parseTimelineFilter(value: string | null): TimelineFilter {
  return value === "messages" || value === "calls" ? value : "all";
}

/** Convierte el valor de la URL en filtro de estado; cualquier otro valor es "all". */
export function parseStatusFilter(value: string | null): StatusFilter {
  return REQUEST_STATUSES.includes(value as RequestStatus) ? (value as RequestStatus) : "all";
}

/**
 * Rejilla de la bandeja. Vive en el layout de /inbox: la lista de conversaciones se
 * monta una sola vez y conserva scroll, búsqueda, filtro, páginas cargadas y selección
 * mientras `children` (hilo + panel de contacto) cambia con la ruta.
 */
export function InboxShell({
  items,
  nextCursor,
  empty,
  loadMore,
  children,
}: {
  items: ConversationListItem[];
  nextCursor: string | null;
  /** No hay ninguna conversación en el negocio. */
  empty: boolean;
  loadMore: (cursor: string) => Promise<ConversationPageResult>;
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const searchParams = useSearchParams();
  const urlFilter = parseTimelineFilter(searchParams.get("filter"));

  const [mobilePane, setMobilePane] = useState<MobilePane>(segment ? "chat" : "list");
  const [filterState, setFilterState] = useState({ source: urlFilter, value: urlFilter });
  const [activeSegment, setActiveSegment] = useState(segment);
  const listRef = useRef<HTMLDivElement>(null);

  // Al abrir otra conversación se muestra el hilo; al volver a /inbox, la lista.
  if (activeSegment !== segment) {
    setActiveSegment(segment);
    setMobilePane(segment ? "chat" : "list");
  }
  // Si la URL cambia el filtro (p. ej. el enlace del sidebar), se reajusta sin effect.
  if (filterState.source !== urlFilter) {
    setFilterState({ source: urlFilter, value: urlFilter });
  }

  useEffect(() => {
    if (mobilePane === "list") {
      listRef.current?.focus({ preventScroll: true });
    }
  }, [mobilePane]);

  const panes = useMemo<InboxPanes>(
    () => ({
      mobilePane,
      setMobilePane,
      timelineFilter: filterState.value,
      setTimelineFilter: (value) => setFilterState({ source: urlFilter, value }),
    }),
    [mobilePane, filterState.value, urlFilter],
  );

  if (empty && !segment) {
    return (
      <EmptyState message="Aún no hay conversaciones. Escribe al WhatsApp del negocio para crear la primera" />
    );
  }

  return (
    <InboxPanesContext.Provider value={panes}>
      <div className="relative grid min-h-[32rem] min-w-0 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_minmax(14rem,18rem)]">
        <div
          ref={listRef}
          tabIndex={-1}
          className={`min-h-0 min-w-0 rounded-lg border border-border bg-card outline-none overflow-hidden ${
            mobilePane === "list" ? "flex" : "hidden"
          } md:flex`}
        >
          <ConversationList
            items={items}
            nextCursor={nextCursor}
            selectedId={segment ?? undefined}
            initialQuery={searchParams.get("q") ?? ""}
            initialStatus={parseStatusFilter(searchParams.get("status"))}
            filter={filterState.value}
            loadMore={loadMore}
            onSelect={() => setMobilePane("chat")}
          />
        </div>
        {children}
      </div>
    </InboxPanesContext.Provider>
  );
}
