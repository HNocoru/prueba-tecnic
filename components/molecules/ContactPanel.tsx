import { formatDate, formatMoney } from "@/components/format";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import type { RequestStatus } from "@/modules/conversations";

export interface ContactRequestItem {
  id: string;
  title: string;
  status: RequestStatus;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPanelData {
  name: string;
  phone: string;
  firstSeenAt: string;
  messageCount: number;
  messagesPartial?: boolean;
  callCount: number;
  status: RequestStatus;
  requests: ContactRequestItem[];
}

/** Panel derecho: identidad, conteos, estado actual y solicitudes del contacto. */
export function ContactPanel({
  contact,
  onClose,
}: {
  contact: ContactPanelData | null;
  onClose?: () => void;
}) {
  return (
    <aside
      aria-label="Datos del contacto"
      className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Contacto</h2>
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

      {contact ? (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="break-words text-base font-semibold text-foreground">{contact.name}</p>
            <p className="mt-0.5 break-words text-sm text-muted-foreground">{contact.phone}</p>
            <div className="mt-2">
              <StatusBadge status={contact.status} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Primera vez</dt>
              <dd className="mt-0.5 text-foreground">{formatDate(contact.firstSeenAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mensajes</dt>
              <dd className="mt-0.5 text-foreground">
                {contact.messageCount}
                {contact.messagesPartial ? "+" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Llamadas</dt>
              <dd className="mt-0.5 text-foreground">{contact.callCount}</dd>
            </div>
          </dl>

          <section aria-labelledby="contact-requests-title">
            <h3
              id="contact-requests-title"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Solicitudes
            </h3>
            {contact.requests.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Este contacto no tiene solicitudes registradas.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {contact.requests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-border p-2.5">
                    <p className="break-words text-sm font-medium text-foreground">
                      {request.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={request.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(request.amount)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Selecciona una conversación para ver los datos del contacto.
        </p>
      )}
    </aside>
  );
}
