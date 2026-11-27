import { ErrorState } from "@/components/molecules/ErrorState";
import { ConnectWhatsAppCard } from "@/components/organisms/ConnectWhatsAppCard";
import { composeWhatsAppConnection } from "@/modules/channels/whatsapp/composition";
import { decideConnectionCard } from "@/modules/channels/whatsapp";

import { connectWhatsAppNumber } from "./actions";
import { resolveTenantId } from "./tenant";

const summaryMetrics = [
  "Conversaciones de hoy",
  "Llamadas atendidas",
  "Pendientes de revisar",
  "Completadas esta semana",
] as const;

export default async function HomePage() {
  const tenantId = await resolveTenantId();
  let connection = null;
  if (tenantId) {
    try {
      connection = await composeWhatsAppConnection().get.execute(tenantId);
    } catch {
      connection = null;
    }
  }

  const view = connection ? decideConnectionCard(connection.status, connection.displayPhone) : null;
  const connected = view?.tone === "ok";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section
        aria-labelledby="home-greeting"
        className="relative overflow-hidden rounded-3xl bg-hero px-6 py-8 sm:px-10 sm:py-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-accent/10 sm:h-72 sm:w-72"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rotate-12 rounded-3xl bg-soft"
        />
        <div className="relative max-w-2xl">
          <h1
            id="home-greeting"
            style={{ fontFamily: "var(--font-display)" }}
            className="text-4xl font-bold leading-tight tracking-tight text-text sm:text-5xl"
          >
            Bienvenido
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-text-2 sm:text-lg">
            {connected
              ? "Tu WhatsApp ya está contestando. Aquí verás qué pasó en cada conversación."
              : "Conecta tu WhatsApp para que tu asistente empiece a atender."}
          </p>
        </div>
      </section>

      {connection && view ? (
        <ConnectWhatsAppCard connection={connection} view={view} action={connectWhatsAppNumber} />
      ) : (
        <ErrorState message="No pudimos cargar el estado de WhatsApp. Recarga la página o vuelve a iniciar sesión." />
      )}

      <section aria-labelledby="home-summary">
        <h2 id="home-summary" className="sr-only">
          Resumen del día
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {summaryMetrics.map((label) => (
            <li key={label} className="min-w-0 rounded-2xl bg-surface p-4 sm:p-5">
              <p className="text-sm text-text-2">{label}</p>
              <p
                className="relative mt-2 text-3xl font-bold leading-none text-text-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span aria-hidden="true">—</span>
                <span className="sr-only">Sin datos todavía</span>
              </p>
              <p className="mt-2 text-xs text-text-2">Disponible pronto</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
