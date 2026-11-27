"use client";

import Link from "next/link";
import { useState } from "react";

import { formatRelativeTime, formatTime } from "@/components/format";
import { Avatar } from "@/components/molecules/Avatar";
import { REQUEST_STATUS_LABEL, StatusBadge, StatusIcon } from "@/components/molecules/StatusBadge";
import { useNow } from "@/components/use-now";
import { REQUEST_STATUSES, type RequestStatus, type TimelineFilter } from "@/modules/conversations";

import type { ConversationListItem, ConversationPageResult } from "./inbox-types";

export type { ConversationListItem } from "./inbox-types";

export type StatusFilter = "all" | RequestStatus;

const STATUS_FILTERS: readonly StatusFilter[] = ["all", ...REQUEST_STATUSES];

function statusFilterLabel(status: StatusFilter): string {
  return status === "all" ? "Todos" : REQUEST_STATUS_LABEL[status];
}

/** Lista de chats con búsqueda y filtro por estado, ambos locales y reflejados en la URL. */
export function ConversationList({
  items,
  nextCursor,
  selectedId,
  initialQuery = "",
  initialStatus = "all",
  filter,
  loadMore,
  onSelect,
}: {
  items: ConversationListItem[];
  nextCursor: string | null;
  selectedId?: string;
  initialQuery?: string;
  initialStatus?: StatusFilter;
  filter: TimelineFilter;
  loadMore: (cursor: string) => Promise<ConversationPageResult>;
  onSelect?: () => void;
}) {
  const now = useNow();
  const [listState, setListState] = useState({
    source: `${initialQuery}|${initialStatus}`,
    query: initialQuery,
    status: initialStatus,
  });
  const [extraItems, setExtraItems] = useState<ConversationListItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Si la navegación cambia la URL (por ejemplo al volver atrás), se reajusta el
  // estado local durante el render sin perder lo que el usuario ya escribió.
  if (listState.source !== `${initialQuery}|${initialStatus}`) {
    setListState({
      source: `${initialQuery}|${initialStatus}`,
      query: initialQuery,
      status: initialStatus,
    });
  }

  const merged = mergeById(items, extraItems);
  const normalized = listState.query.trim().toLocaleLowerCase("es-MX");
  const digits = normalized.replace(/\D/g, "");
  const visible = merged.filter((item) => {
    if (listState.status !== "all" && item.status !== listState.status) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const text = `${item.name} ${item.phone}`.toLocaleLowerCase("es-MX");
    return (
      text.includes(normalized) ||
      (digits.length > 0 && item.phone.replace(/\D/g, "").includes(digits))
    );
  });

  function syncUrl(nextQuery: string, nextStatus: StatusFilter) {
    const url = new URL(window.location.href);
    if (nextQuery.trim()) {
      url.searchParams.set("q", nextQuery);
    } else {
      url.searchParams.delete("q");
    }
    if (nextStatus !== "all") {
      url.searchParams.set("status", nextStatus);
    } else {
      url.searchParams.delete("status");
    }
    window.history.replaceState(null, "", url);
  }

  function changeQuery(value: string) {
    setListState({ source: listState.source, query: value, status: listState.status });
    syncUrl(value, listState.status);
  }

  function changeStatus(value: StatusFilter) {
    setListState({ source: listState.source, query: listState.query, status: value });
    syncUrl(listState.query, value);
  }

  function clearFilters() {
    setListState({ source: listState.source, query: "", status: "all" });
    syncUrl("", "all");
  }

  async function handleLoadMore() {
    if (!cursor || loading) {
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const page = await loadMore(cursor);
      if (page.error) {
        setLoadError(true);
        return;
      }
      setExtraItems((current) => mergeById(current, page.items));
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  function hrefFor(item: ConversationListItem): string {
    const params = new URLSearchParams({ filter });
    if (listState.query.trim()) {
      params.set("q", listState.query);
    }
    if (listState.status !== "all") {
      params.set("status", listState.status);
    }
    return `/inbox/${item.id}?${params.toString()}`;
  }

  const filtersActive = listState.query.trim().length > 0 || listState.status !== "all";

  return (
    <section
      aria-label="Conversaciones"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
    >
      <div className="space-y-2 border-b border-border p-3">
        <label htmlFor="conversation-search" className="sr-only">
          Buscar conversaciones por nombre o número
        </label>
        <input
          id="conversation-search"
          type="search"
          value={listState.query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Buscar por nombre o número"
          autoComplete="off"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5" role="group">
          {STATUS_FILTERS.map((status) => {
            const active = listState.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => changeStatus(status)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-foreground/30 bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/60"
                }`}
              >
                {status === "all" ? null : <StatusIcon status={status} />}
                {statusFilterLabel(status)}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="min-h-0 min-w-0 flex-1 divide-y divide-border overflow-y-auto overflow-x-hidden">
        {visible.length === 0 ? (
          <li className="flex flex-col items-center gap-2 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {filtersActive
                ? "No hay conversaciones que coincidan con la búsqueda o el estado."
                : "Aún no hay conversaciones."}
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Limpiar filtros
              </button>
            ) : null}
          </li>
        ) : (
          visible.map((item) => {
            const active = item.id === selectedId;
            return (
              <li key={item.id} className="min-w-0">
                <Link
                  href={hrefFor(item)}
                  aria-current={active ? "page" : undefined}
                  onClick={onSelect}
                  className={`flex min-w-0 gap-3 p-3 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    active
                      ? "bg-accent text-accent-foreground [&_.text-muted-foreground]:text-accent-foreground/85"
                      : ""
                  }`}
                >
                  <Avatar name={item.name} phone={item.phone} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{item.name}</span>
                      <time
                        dateTime={item.lastActivityAt}
                        title={formatTime(item.lastActivityAt)}
                        className="shrink-0 text-[11px] text-muted-foreground"
                      >
                        {now === null
                          ? formatTime(item.lastActivityAt)
                          : formatRelativeTime(item.lastActivityAt, now)}
                      </time>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.preview}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={item.status} />
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.phone}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>

      {loadError ? (
        <p role="alert" className="border-t border-border p-2 text-center text-xs text-destructive">
          No se pudo cargar más conversaciones.
        </p>
      ) : null}
      {cursor ? (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function mergeById(
  first: ConversationListItem[],
  second: ConversationListItem[],
): ConversationListItem[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
