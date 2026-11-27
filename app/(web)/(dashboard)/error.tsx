"use client";

/**
 * Límite de error del dashboard. Una sesión puede seguir siendo válida (JWT) mientras el usuario o su
 * negocio ya no existen (p. ej. tras reiniciar la base): en vez de mostrar un error crudo, se ofrece
 * reintentar o cerrar la sesión y volver a entrar. El mensaje real nunca se muestra (en producción
 * Next lo oculta y solo deja un digest).
 */
export default function DashboardError() {
  return (
    <div
      role="alert"
      className="mx-auto mt-10 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center"
    >
      <h1 className="text-xl font-semibold text-foreground">No pudimos cargar esta pantalla</h1>
      <p className="text-sm text-muted-foreground">
        Puede ser un fallo temporal o que tu sesión ya no sea válida. Intenta de nuevo o inicia
        sesión otra vez.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reintentar
        </button>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión de nuevo
          </button>
        </form>
      </div>
    </div>
  );
}
