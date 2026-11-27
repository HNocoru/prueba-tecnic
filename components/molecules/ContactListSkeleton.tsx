import { P5Icon } from "@/components/atoms/P5Icon";
import { p5CardClass } from "@/components/atoms/p5-styles";

/** Esqueleto de la lista de contactos: misma altura de fila para no saltar el layout. */
export function ContactListSkeleton() {
  return (
    <div role="status" aria-live="polite" className={`relative ${p5CardClass}`}>
      <span className="sr-only">Cargando contactos…</span>
      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-soft text-accent">
          <P5Icon name="refresh" className="h-5 w-5 animate-spin" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-64 max-w-full animate-pulse rounded bg-surface-2" />
        </div>
      </div>
      <div aria-hidden="true" className="mt-5 flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl bg-surface p-3 md:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-surface-2" />
            <div className="space-y-2">
              <div className="h-4 w-40 max-w-full animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
            </div>
            <div className="hidden h-3 w-24 animate-pulse rounded bg-surface-2 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
