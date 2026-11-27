/** Esqueleto genérico de una tarjeta de contenido para pantallas simples del dashboard. */
export function CardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando"
      className="space-y-3 rounded-lg border border-border bg-card p-6"
    >
      <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
