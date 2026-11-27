"use client";

import type { TimelineFilter } from "@/modules/conversations";

const OPTIONS: readonly { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "messages", label: "Mensajes" },
  { value: "calls", label: "Llamadas" },
];

/**
 * Control segmentado local: filtra la línea de tiempo ya cargada, sin navegar ni
 * volver a consultar el servidor. El valor se refleja en la URL para compartirla.
 */
export function TimelineFilterTabs({
  active,
  onChange,
}: {
  active: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
}) {
  return (
    <nav
      aria-label="Filtrar línea de tiempo"
      className="flex gap-1 rounded-lg border border-border p-1"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={active === option.value}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active === option.value ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
