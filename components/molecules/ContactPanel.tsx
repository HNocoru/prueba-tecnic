import { formatDate } from "@/components/format";

export interface ContactPanelData {
  name: string;
  phone: string;
  firstSeenAt: string;
  messageCount: number;
  callCount: number;
}

/** Panel derecho con la identidad del contacto y sus conteos. */
export function ContactPanel({ contact }: { contact: ContactPanelData | null }) {
  return (
    <aside
      aria-label="Datos del contacto"
      className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">Contacto</h2>
      {contact ? (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Nombre</dt>
            <dd className="break-words text-foreground">{contact.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Número</dt>
            <dd className="break-words text-foreground">{contact.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Primera vez</dt>
            <dd className="text-foreground">{formatDate(contact.firstSeenAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Mensajes</dt>
            <dd className="text-foreground">{contact.messageCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Llamadas</dt>
            <dd className="text-foreground">{contact.callCount}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Selecciona una conversación para ver los datos del contacto.
        </p>
      )}
    </aside>
  );
}
