/** Esqueleto con la misma rejilla que InboxView (lista + conversación + panel) para evitar saltos. */
export function InboxSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando bandeja"
      className="grid min-h-[32rem] grid-cols-1 gap-4 lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)_minmax(14rem,16rem)]"
    >
      <div className="hidden min-h-0 flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-12 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="ml-auto h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="hidden space-y-3 rounded-lg border border-border bg-card p-4 lg:block">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
