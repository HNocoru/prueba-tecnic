/** Esqueleto genérico de una tarjeta de contenido para pantallas simples del dashboard. */
export function CardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-3 rounded-lg border border-border bg-card p-6"
    >
      <p className="sr-only">Cargando contenido…</p>
      <div aria-hidden="true" className="h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div aria-hidden="true" className="h-4 w-full animate-pulse rounded bg-muted" />
      <div aria-hidden="true" className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
