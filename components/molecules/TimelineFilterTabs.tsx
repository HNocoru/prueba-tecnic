import Link from "next/link";
import type { TimelineFilter } from "@/modules/conversations";

const OPTIONS: readonly { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "messages", label: "Mensajes" },
  { value: "calls", label: "Llamadas" },
];

/** Control segmentado: el filtro viaja en searchParams para ser compartible. */
export function TimelineFilterTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: TimelineFilter;
}) {
  return (
    <nav
      aria-label="Filtrar línea de tiempo"
      className="flex gap-1 rounded-lg border border-border p-1"
    >
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`${basePath}?filter=${option.value}`}
          aria-current={active === option.value ? "page" : undefined}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
            active === option.value ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
