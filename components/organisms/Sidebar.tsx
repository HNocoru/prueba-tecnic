import { SidebarLink } from "@/components/atoms/SidebarLink";

const NAV_ITEMS = [
  { href: "/home", label: "Inicio" },
  { href: "/inbox", label: "Bandeja" },
  { href: "/contacts", label: "Contactos" },
  { href: "/business", label: "Negocio" },
  { href: "/assistant", label: "Asistente" },
  { href: "/account", label: "Cuenta" },
] as const;

/**
 * Navegación del dashboard. En pantallas angostas se colapsa con <details>
 * (sin JS); en md+ siempre visible.
 */
export function Sidebar() {
  return (
    <aside className="w-full border-b border-border bg-background md:w-64 md:border-b-0 md:border-r">
      <details className="group md:contents" open>
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold md:hidden">
          Menú
        </summary>
        <div className="flex flex-col gap-6 p-4 pt-0 md:min-h-screen md:p-6">
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} href={item.href}>
                {item.label}
              </SidebarLink>
            ))}
          </nav>
          <div className="mt-auto">
            {/* POST: cerrar sesión nunca debe dispararse con un enlace o prefetch */}
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </details>
    </aside>
  );
}
