interface StatusCardProps {
  title: string;
  status: string;
  description: string;
  actionLabel: string;
}

/** Tarjeta con título, estado y acción (placeholder, sin lógica aún). */
export function StatusCard({ title, status, description, actionLabel }: StatusCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <button
        type="button"
        disabled
        className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
      >
        {actionLabel}
      </button>
    </section>
  );
}
