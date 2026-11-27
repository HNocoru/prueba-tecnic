"use client";

import { useState } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";
import {
  contactCountLabel,
  contactInitials,
  filterContactItems,
  mergeContactsById,
  noContactResultsTitle,
  relativeDay,
} from "@/components/atoms/p5-presentation";
import { p5CardClass, p5FieldClass, p5SecondaryButtonClass } from "@/components/atoms/p5-styles";
import { P5StateNotice } from "@/components/molecules/P5StateNotice";

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

  const merged = mergeContactsById(items, extraItems);
  const visible = filterContactItems(merged, query);

  async function handleLoadMore() {
    if (!cursor || loading) {
      return;
    }
    setLoading(true);
    try {
      const page = await loadMore(cursor);
      setExtraItems((current) => mergeContactsById(current, page.items));
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Lista de contactos" className={p5CardClass}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2
            className="text-xl font-semibold text-text md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Lista de contactos
          </h2>
          <p className="mt-1 text-sm text-text-2">
            {contactCountLabel(visible.length, merged.length, query)}
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <label htmlFor="contact-search" className="sr-only">
            Buscar por nombre o teléfono
          </label>
          <P5Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-2"
          />
          <input
            id="contact-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className={`${p5FieldClass} pl-10 pr-12`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-text-2 hover:bg-surface"
            >
              <P5Icon name="close" className="h-4 w-4" />
              <span className="sr-only">Limpiar búsqueda</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 hidden grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-surface-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-2 md:grid">
        <span />
        <span>Contacto</span>
        <span>Teléfono</span>
        <span>Primer contacto</span>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {visible.length === 0 ? (
          <li>
            <P5StateNotice
              icon="search"
              title={noContactResultsTitle(query)}
              description="Revisa cómo escribiste el nombre, o prueba solo con los últimos dígitos del teléfono."
              action={
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent"
                >
                  Limpiar búsqueda
                </button>
              }
            />
          </li>
        ) : (
          visible.map((item) => (
            <li
              key={item.id}
              className="relative grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl bg-surface p-3 md:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-soft text-sm font-semibold text-accent">
                {contactInitials(item.name, item.redacted)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                <p className="mt-1 truncate text-xs text-text-2 md:hidden">
                  <span className="sr-only">Teléfono: </span>
                  {item.phone}
                </p>
              </div>
              <p className="hidden min-w-0 truncate text-sm text-text-2 md:block">{item.phone}</p>
              <time dateTime={item.createdAt} className="text-xs text-text-2 md:whitespace-nowrap">
                <span className="md:hidden">Primer contacto · </span>
                {relativeDay(item.createdAt)}
              </time>
            </li>
          ))
        )}
      </ul>

      {cursor ? (
        <div className="mt-4 border-t border-surface-2 pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className={`${p5SecondaryButtonClass} w-full sm:w-auto`}
          >
            <P5Icon name={loading ? "refresh" : "plus"} className="h-4 w-4" />
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-text-2">
          <P5Icon name="check" className="h-4 w-4 text-status-done-fg" />
          Ya viste a todos tus contactos.
        </p>
      )}
    </section>
  );
}
