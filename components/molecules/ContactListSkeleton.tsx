/** Esqueleto de la lista de contactos: misma altura de fila para no saltar el layout. */
export function ContactListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando contactos"
      className="rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border p-3">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-baseline justify-between gap-2 p-3">
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
