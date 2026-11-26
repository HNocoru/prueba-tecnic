"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

interface SidebarLinkProps {
  href: string;
  children: ReactNode;
}

const BASE_CLASSES =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground";

/** Enlace de navegación que resalta la ruta activa. */
function ActiveSidebarLink({ href, children }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${BASE_CLASSES} ${active ? "bg-accent text-accent-foreground" : "text-foreground"}`}
    >
      {children}
    </Link>
  );
}

/** usePathname solo se lee dentro de Suspense para no bloquear el prerenderizado. */
export function SidebarLink({ href, children }: SidebarLinkProps) {
  return (
    <Suspense
      fallback={
        <Link href={href} className={`${BASE_CLASSES} text-foreground`}>
          {children}
        </Link>
      }
    >
      <ActiveSidebarLink href={href}>{children}</ActiveSidebarLink>
    </Suspense>
  );
}
