import type { ReactNode } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";

/** Encabezado de las pantallas de la Parte 5: titular Bricolage sobre fondo hero. */
export function P5PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 min-w-0 rounded-3xl bg-hero p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="flex items-start gap-3 text-3xl font-bold leading-tight text-text md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <P5Icon name="sparkles" className="mt-1 h-6 w-6 shrink-0 text-accent md:h-7 md:w-7" />
            <span className="min-w-0 break-words">{title}</span>
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-text-2 md:text-base">{description}</p>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
