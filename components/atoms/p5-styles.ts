/** Clases compartidas de la dirección A para los formularios de la Parte 5. */

export const p5CardClass =
  "min-w-0 rounded-3xl border border-surface-2 bg-card p-4 shadow-sm md:p-6";

export const p5SurfaceCardClass = "min-w-0 rounded-3xl bg-surface p-4 md:p-6";

export const p5LabelClass = "text-sm font-medium text-text";

export const p5FieldClass =
  "min-h-11 w-full rounded-xl border border-surface-2 bg-card px-3 py-2 text-sm text-text placeholder:text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export const p5TextareaClass = `${p5FieldClass} resize-y`;

export const p5PrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-canvas transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

export const p5SecondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-surface-2 bg-card px-4 text-sm font-medium text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60";

export const p5ActionRowClass = "flex flex-wrap gap-2";

export const p5ChipClass =
  "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text";
