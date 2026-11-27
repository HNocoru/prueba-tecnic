/** Esqueleto de /home con la forma real: hero, tarjeta y franja de métricas. */
function Bar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-surface-2 ${className}`} />;
}

export function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <p className="sr-only">Cargando el inicio…</p>

      <section className="relative overflow-hidden rounded-3xl bg-hero px-6 py-8 sm:px-10 sm:py-10">
        <Bar className="h-10 w-2/3 max-w-xs rounded-xl sm:h-12" />
        <div className="mt-4">
          <Bar className="h-4 w-full max-w-md" />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-surface-2 bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bar className="h-6 w-48" />
          <Bar className="h-7 w-24 rounded-full" />
        </div>
        <Bar className="h-4 w-2/3" />
        <div className="rounded-2xl bg-card p-4">
          <Bar className="h-4 w-1/3" />
          <div className="mt-3">
            <Bar className="h-4 w-full" />
          </div>
          <div className="mt-4">
            <Bar className="h-11 w-44 rounded-full" />
          </div>
        </div>
      </section>

      <section>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className="min-w-0 rounded-2xl bg-surface p-4 sm:p-5">
              <Bar className="h-4 w-3/4" />
              <div className="mt-3">
                <Bar className="h-8 w-12" />
              </div>
              <div className="mt-3">
                <Bar className="h-3 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
