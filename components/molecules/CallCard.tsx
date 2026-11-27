import { formatCallOutcome, formatDuration, formatTime } from "@/components/format";
import type { CallOutcome } from "@/modules/conversations";

export interface CallCardData {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  outcome: CallOutcome;
  summary: string | null;
}

/** Tarjeta compacta de llamada; al pulsarla se abre su reporte en el panel derecho. */
export function CallCard({
  call,
  selected = false,
  onSelect,
}: {
  call: CallCardData;
  selected?: boolean;
  onSelect?: (call: CallCardData) => void;
}) {
  return (
    <li className="flex justify-center">
      <button
        type="button"
        onClick={() => onSelect?.(call)}
        aria-pressed={selected}
        aria-label={`Ver reporte de la llamada del ${formatTime(call.startedAt)}`}
        className={`w-full max-w-md rounded-xl border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected
            ? "border-foreground/30 bg-accent text-accent-foreground"
            : "border-border bg-card hover:bg-accent/60"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5.5 2.5 7 5 5.8 6.2a9 9 0 0 0 4 4L11 9l2.5 1.5v2a1 1 0 0 1-1.1 1A11.5 11.5 0 0 1 2.5 3.6 1 1 0 0 1 3.5 2.5h2Z" />
            </svg>
            Llamada · {formatCallOutcome(call.outcome)}
          </span>
          <time dateTime={call.startedAt} className="shrink-0 text-xs text-muted-foreground">
            {formatTime(call.startedAt)}
          </time>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {formatDuration(call.durationSeconds)}
        </span>
        <span className="mt-1.5 line-clamp-2 block break-words text-xs text-foreground/80">
          {call.summary?.trim() || "Sin resumen de la llamada."}
        </span>
        <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground">
          Ver reporte
        </span>
      </button>
    </li>
  );
}
