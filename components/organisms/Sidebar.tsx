import { NavIcon, type NavIconName } from "@/components/atoms/NavIcon";
import { SidebarLink } from "@/components/atoms/SidebarLink";

const NAV_ITEMS: { href: string; label: string; icon: NavIconName }[] = [
  { href: "/home", label: "Inicio", icon: "home" },
  { href: "/inbox", label: "Bandeja", icon: "inbox" },
  { href: "/contacts", label: "Contactos", icon: "contacts" },
  { href: "/business", label: "Negocio", icon: "business" },
  { href: "/assistant", label: "Asistente", icon: "assistant" },
  { href: "/account", label: "Cuenta", icon: "account" },
];

/**
 * Navegación del dashboard (dirección A): barra inferior en móvil, rail de
 * iconos en md y barra lateral con etiquetas desde xl. Sin estado ni JS propio.
 */
export function Sidebar() {
  return (
    <aside className="order-2 flex shrink-0 items-stretch overflow-x-auto border-t border-surface-2 bg-canvas md:order-1 md:w-20 md:flex-col md:overflow-visible md:border-r md:border-t-0 md:bg-surface xl:w-64">
      <nav
        aria-label="Principal"
        className="flex min-w-full flex-1 items-stretch justify-around gap-0.5 md:min-w-0 md:flex-col md:justify-start md:gap-1 md:p-3"
      >
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={item.icon}>
            {item.label}
          </SidebarLink>
        ))}
        {/* POST: cerrar sesión nunca debe dispararse con un enlace o prefetch */}
        <form
          action="/api/auth/logout"
          method="post"
          className="flex shrink-0 items-stretch md:mt-auto md:block"
        >
          <button
            type="submit"
            className="flex min-h-11 min-w-[2.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight text-text-2 transition-colors hover:bg-surface-2 hover:text-text md:flex-none md:flex-row md:w-full md:gap-3 md:rounded-full md:px-3 md:text-sm"
          >
            <NavIcon name="logout" className="h-5 w-5 shrink-0" />
            <span className="md:sr-only xl:not-sr-only">Cerrar sesión</span>
          </button>
        </form>
      </nav>
    </aside>
  );
}
