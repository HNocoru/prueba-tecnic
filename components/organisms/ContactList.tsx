"use client";

import { useState } from "react";
import { formatDate } from "@/components/format";

import type { ContactListItem, ContactPageResult } from "./contact-types";

/** Lista de contactos con búsqueda local y páginas por cursor. */
export function ContactList({
  items,
  nextCursor,
  loadMore,
}: {
  items: ContactListItem[];
  nextCursor: string | null;
  loadMore: (cursor: string) => Promise<ContactPageResult>;
}) {
  const [query, setQuery] = useState("");
  const [extraItems, setExtraItems] = useState<ContactListItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);

  const merged = mergeById(items, extraItems);
  const normalized = query.trim().toLocaleLowerCase("es-MX");
  const visible = merged.filter((item) =>
    `${item.name} ${item.phone}`.toLocaleLowerCase("es-MX").includes(normalized),
  );

  async function handleLoadMore() {
    if (!cursor || loading) {
      return;
    }
    setLoading(true);
    try {
      const page = await loadMore(cursor);
      setExtraItems((current) => mergeById(current, page.items));
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Contactos" className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-3">
        <label htmlFor="contact-search" className="sr-only">
          Buscar contactos por nombre o número
        </label>
        <input
          id="contact-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o número"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <ul className="divide-y divide-border">
        {visible.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">
            No hay contactos que coincidan con la búsqueda.
          </li>
        ) : (
          visible.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.phone}</p>
              </div>
              <time dateTime={item.createdAt} className="text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </time>
            </li>
          ))
        )}
      </ul>
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

function mergeById(first: ContactListItem[], second: ContactListItem[]): ContactListItem[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
