import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-border bg-background p-4 md:w-64 md:border-b-0 md:border-r md:p-6">
      <nav className="flex flex-row gap-2 md:flex-col">
        <Link
          href="/contacts"
          className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Contactos
        </Link>
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
    </aside>
  );
}
