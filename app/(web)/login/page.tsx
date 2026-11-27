import { LoginForm } from "./login-form";

/** Familia de display: el titular debe renderizarse con Bricolage Grotesque. */
const displayFont = "var(--font-display), ui-rounded, system-ui, sans-serif";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh w-full grid-cols-1 overflow-x-hidden bg-canvas lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section
        aria-labelledby="login-hero-title"
        className="relative flex min-w-0 flex-col justify-between gap-12 overflow-hidden bg-hero px-6 py-10 sm:px-10 lg:px-14 lg:py-14"
      >
        <svg
          className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 text-accent/10 sm:h-[26rem] sm:w-[26rem]"
          viewBox="0 0 400 400"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="320" cy="80" r="130" />
          <circle cx="70" cy="350" r="95" className="text-accent/5" />
          <rect
            x="250"
            y="250"
            width="120"
            height="120"
            rx="36"
            transform="rotate(14 310 310)"
            className="text-accent/5"
          />
        </svg>

        <div className="relative flex items-center gap-3 text-lg font-semibold text-text">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-canvas"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
            >
              <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 20l1.9-5a7.5 7.5 0 1 1 14.1-3.5Z" />
              <path d="M9 11.5h6M9 14.5h4" />
            </svg>
          </span>
          <span>Asistente IA</span>
        </div>

        <div className="relative max-w-2xl">
          <h1
            id="login-hero-title"
            className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-text sm:text-5xl lg:text-6xl"
            style={{ fontFamily: displayFont }}
          >
            Tu WhatsApp contesta, aunque estés ocupado.
          </h1>
          <p className="mt-5 max-w-xl text-base text-text-2 sm:text-lg">
            Mira quién escribió o llamó, qué dijo y cómo terminó cada conversación.
          </p>
        </div>
      </section>

      <section className="flex min-w-0 items-start justify-center bg-canvas px-6 py-10 sm:px-10 sm:py-14 lg:items-center">
        <div className="w-full max-w-md">
          <h2
            id="login-title"
            className="text-3xl font-semibold tracking-tight text-text"
            style={{ fontFamily: displayFont }}
          >
            Inicia sesión
          </h2>
          <p className="mt-2 mb-8 text-sm text-text-2">
            Entra para ver las conversaciones de tu negocio.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
