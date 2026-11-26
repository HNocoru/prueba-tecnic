"use client";

import { useState } from "react";

import { CallCard, type CallCardData } from "@/components/molecules/CallCard";
import { ContactPanel, type ContactPanelData } from "@/components/molecules/ContactPanel";
import { EmptyState } from "@/components/molecules/EmptyState";
import { MessageBubble, type MessageBubbleData } from "@/components/molecules/MessageBubble";
import { TimelineFilterTabs } from "@/components/molecules/TimelineFilterTabs";
import type { TimelineFilter } from "@/modules/conversations";

import { ConversationList, type ConversationListItem } from "./ConversationList";

export type InboxTimelineItem =
  ({ type: "message" } & MessageBubbleData) | ({ type: "call" } & CallCardData);

export interface InboxViewProps {
  items: ConversationListItem[];
  selectedId?: string;
  selectedName?: string;
  timeline: InboxTimelineItem[];
  contact: ContactPanelData | null;
  filter: TimelineFilter;
  query: string;
}

/** Bandeja de tres columnas. En pantallas angostas, lista y conversación se alternan. */
export function InboxView({
  items,
  selectedId,
  selectedName,
  timeline,
  contact,
  filter,
  query,
}: InboxViewProps) {
  const [mobilePane, setMobilePane] = useState<"list" | "chat">(selectedId ? "chat" : "list");
  const filterBase = selectedId ? `/inbox/${selectedId}` : "/inbox";

  return (
    <div className="grid min-h-[32rem] grid-cols-1 gap-4 lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_minmax(14rem,16rem)]">
      <div
        className={`min-h-0 rounded-lg border border-border bg-card ${
          mobilePane === "list" ? "flex" : "hidden"
        } md:flex`}
      >
        <ConversationList
          items={items}
          selectedId={selectedId}
          initialQuery={query}
          filter={filter}
          onSelect={() => setMobilePane("chat")}
        />
      </div>

      <section
        aria-label="Conversación"
        className={`min-h-0 flex-col rounded-lg border border-border bg-card ${
          mobilePane === "chat" ? "flex" : "hidden"
        } md:flex`}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobilePane("list")}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              Volver
            </button>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {selectedName ?? "Selecciona una conversación"}
            </h2>
          </div>
          {selectedId ? <TimelineFilterTabs basePath={filterBase} active={filter} /> : null}
        </header>

        {!selectedId ? (
          <EmptyState message="Selecciona una conversación para ver sus mensajes y llamadas." />
        ) : timeline.length === 0 ? (
          <EmptyState message="No hay mensajes ni llamadas con este filtro." />
        ) : (
          <ol className="flex-1 space-y-3 overflow-y-auto p-4">
            {timeline.map((entry) =>
              entry.type === "message" ? (
                <MessageBubble key={entry.id} message={entry} />
              ) : (
                <CallCard key={entry.id} call={entry} />
              ),
            )}
          </ol>
        )}
      </section>

      <div className="hidden lg:block">
        <ContactPanel contact={contact} />
      </div>
    </div>
  );
}
