import type { ReactNode } from "react";

import type { RequestStatus } from "@/modules/conversations";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  none: "Sin estado",
  pending: "Pendiente",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  none: "border-border bg-muted text-muted-foreground",
  pending:
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  in_progress:
    "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
  completed:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  cancelled:
    "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
};

/** Ícono propio por estado: el color nunca es la única señal. */
export function StatusIcon({ status }: { status: RequestStatus }): ReactNode {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
    >
      {status === "none" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M5 8h6" />
        </>
      ) : null}
      {status === "pending" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2.5 1.5" />
        </>
      ) : null}
      {status === "in_progress" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M5.5 8h5M8.5 5.5 11 8l-2.5 2.5" />
        </>
      ) : null}
      {status === "completed" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="m5.2 8.2 1.9 1.9 3.7-4" />
        </>
      ) : null}
      {status === "cancelled" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4" />
        </>
      ) : null}
    </svg>
  );
}

/** Estado del chat con color, ícono y texto; nunca depende solo del color. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}
    >
      <StatusIcon status={status} />
      <span className="truncate">{REQUEST_STATUS_LABEL[status]}</span>
    </span>
  );
}
