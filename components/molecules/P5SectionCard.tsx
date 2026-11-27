import type { ReactNode } from "react";

import { P5Icon, type P5IconName } from "@/components/atoms/P5Icon";
import { p5CardClass } from "@/components/atoms/p5-styles";

/** Tarjeta de sección con título Bricolage, ícono y nota contextual. */
export function P5SectionCard({
  id,
  title,
  description,
  icon,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  icon: P5IconName;
  children: ReactNode;
}) {
  return (
    <section id={id} className={p5CardClass}>
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-accent">
          <P5Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            className="text-xl font-semibold leading-tight text-text md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-text-2">{description}</p> : null}
        </div>
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
