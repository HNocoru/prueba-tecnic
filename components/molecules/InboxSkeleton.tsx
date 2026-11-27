/** Esqueleto de la lista: búsqueda, chips y filas con avatar y estado. */
export function ConversationListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando conversaciones"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="space-y-2 border-b border-border p-3">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-3 p-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de la conversación: burbujas alternadas y separadores de día. */
export function ConversationPaneSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando conversación"
      className="flex min-h-0 flex-1 flex-col gap-3 p-4"
    >
      <div className="mx-auto h-5 w-28 animate-pulse rounded-full bg-muted" />
      <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-muted" />
      <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-muted" />
      <div className="h-16 w-1/2 animate-pulse rounded-2xl bg-muted" />
      <div className="ml-auto h-12 w-3/5 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

/** Esqueleto del panel derecho: identidad, estado y solicitudes. */
export function ContactPanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando datos del contacto" className="space-y-4 p-4">
      <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

/** Esqueleto de la transcripción de una llamada. */
export function CallSessionSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando transcripción"
      className="flex min-h-0 flex-1 flex-col gap-3 p-4"
    >
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
      <div className="ml-auto h-14 w-3/4 animate-pulse rounded-2xl bg-muted" />
      <div className="h-12 w-1/2 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

/** Esqueleto con la misma rejilla que InboxView para evitar saltos de layout. */
export function InboxSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando bandeja"
      className="grid min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)] lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_minmax(14rem,16rem)]"
    >
      <div className="hidden min-h-0 rounded-lg border border-border bg-card md:block">
        <ConversationListSkeleton />
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
        <ConversationPaneSkeleton />
      </div>
      <div className="hidden rounded-lg border border-border bg-card lg:block">
        <ContactPanelSkeleton />
      </div>
    </div>
  );
}
