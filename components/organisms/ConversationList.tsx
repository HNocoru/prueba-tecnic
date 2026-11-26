"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTime } from "@/components/format";
import type { TimelineFilter } from "@/modules/conversations";

export interface ConversationListItem {
  id: string;
  name: string;
  phone: string;
  preview: string;
  lastActivityAt: string;
}

/** Lista de conversaciones con búsqueda local por nombre o número. */
export function ConversationList({
  items,
  selectedId,
  initialQuery = "",
  filter,
  onSelect,
}: {
  items: ConversationListItem[];
  selectedId?: string;
  initialQuery?: string;
  filter: TimelineFilter;
  onSelect?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const normalized = query.trim().toLocaleLowerCase("es-MX");
  const visible = items.filter((item) =>
    `${item.name} ${item.phone}`.toLocaleLowerCase("es-MX").includes(normalized),
  );

  return (
    <section aria-label="Conversaciones" className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <label htmlFor="conversation-search" className="sr-only">
          Buscar conversaciones por nombre o número
        </label>
        <input
          id="conversation-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o número"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {visible.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">
            No hay conversaciones que coincidan con la búsqueda.
          </li>
        ) : (
          visible.map((item) => {
            const active = item.id === selectedId;
            return (
              <li key={item.id}>
                <Link
                  href={`/inbox/${item.id}?filter=${filter}`}
                  aria-current={active ? "page" : undefined}
                  onClick={onSelect}
                  className={`block p-3 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <time
                      dateTime={item.lastActivityAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatTime(item.lastActivityAt)}
                    </time>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {item.phone}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {item.preview}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
