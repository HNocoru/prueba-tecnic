"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { NavIcon, type NavIconName } from "./NavIcon";

interface SidebarLinkProps {
  href: string;
  icon: NavIconName;
  children: ReactNode;
}

const BASE_CLASSES =
  "flex min-h-11 min-w-[2.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors hover:bg-surface-2 hover:text-text md:min-h-12 md:flex-none md:flex-row md:gap-3 md:rounded-full md:px-3 md:text-sm";

/** Enlace de navegación que resalta la ruta activa. */
function ActiveSidebarLink({ href, icon, children }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${BASE_CLASSES} ${active ? "bg-soft font-semibold text-text" : "text-text-2"}`}
    >
      <span className={active ? "text-accent" : undefined}>
        <NavIcon name={icon} className="h-5 w-5 shrink-0" />
      </span>
      <span className="md:sr-only xl:not-sr-only">{children}</span>
    </Link>
  );
}

/** usePathname solo se lee dentro de Suspense para no bloquear el prerenderizado. */
export function SidebarLink({ href, icon, children }: SidebarLinkProps) {
  return (
    <Suspense
      fallback={
        <Link href={href} className={`${BASE_CLASSES} text-text-2`}>
          <NavIcon name={icon} className="h-5 w-5 shrink-0" />
          <span className="md:sr-only xl:not-sr-only">{children}</span>
        </Link>
      }
    >
      <ActiveSidebarLink href={href} icon={icon}>
        {children}
      </ActiveSidebarLink>
    </Suspense>
  );
}
