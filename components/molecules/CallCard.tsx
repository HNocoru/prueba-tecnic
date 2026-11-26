import { formatCallOutcome, formatDuration, formatTime } from "@/components/format";
import type { CallOutcome } from "@/modules/conversations";

export interface CallCardData {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
  outcome: CallOutcome;
  summary: string | null;
}

/** Tarjeta de llamada dentro de la línea de tiempo. */
export function CallCard({ call }: { call: CallCardData }) {
  return (
    <li className="flex justify-center">
      <article className="w-full max-w-md rounded-lg border border-border bg-card p-3 text-sm">
        <p className="font-medium text-foreground">Llamada · {formatCallOutcome(call.outcome)}</p>
        <p className="mt-1 text-muted-foreground">
          {formatDuration(call.durationSeconds)} ·{" "}
          <time dateTime={call.startedAt}>{formatTime(call.startedAt)}</time>
        </p>
        {call.summary ? <p className="mt-2 whitespace-pre-wrap">{call.summary}</p> : null}
      </article>
    </li>
  );
}
