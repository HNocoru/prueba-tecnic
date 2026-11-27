import { formatCallOutcome, formatDate, formatDuration, formatTime } from "@/components/format";

import type { CallCardData } from "./CallCard";

/** Reporte de la llamada seleccionada, con acceso a su transcripción. */
export function CallReportPanel({
  call,
  loading,
  viewing,
  onViewSession,
  onClear,
  onClose,
}: {
  call: CallCardData;
  loading: boolean;
  viewing: boolean;
  onViewSession: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <aside
      aria-label="Reporte de la llamada"
      className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Reporte de llamada</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            Volver
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <div>
          <p className="text-base font-semibold text-foreground">
            {formatCallOutcome(call.outcome)}
          </p>
          <p className="mt-1 text-muted-foreground">
            {formatDate(call.startedAt)} · {formatTime(call.startedAt)}
          </p>
        </div>

        <dl className="space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Inicio</dt>
            <dd className="text-right text-foreground">
              <time dateTime={call.startedAt}>{formatTime(call.startedAt)}</time>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Duración</dt>
            <dd className="text-foreground">{formatDuration(call.durationSeconds)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Resultado</dt>
            <dd className="text-right text-foreground">{formatCallOutcome(call.outcome)}</dd>
          </div>
        </dl>

        <section aria-labelledby="call-summary-title">
          <h3
            id="call-summary-title"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Resumen
          </h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-foreground">
            {call.summary?.trim() || "Esta llamada no tiene resumen."}
          </p>
        </section>
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <button
          type="button"
          onClick={onViewSession}
          disabled={loading}
          aria-haspopup="dialog"
          aria-expanded={viewing}
          aria-controls="call-window"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading ? "Cargando sesión…" : viewing ? "Viendo sesión" : "Ver sesión"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Volver al contacto
        </button>
      </div>
    </aside>
  );
}
