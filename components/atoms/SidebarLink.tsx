"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SidebarLinkProps {
  href: string;
  children: ReactNode;
}

/** Enlace de navegación que resalta la ruta activa. */
export function SidebarLink({ href, children }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
        active ? "bg-accent text-accent-foreground" : "text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
