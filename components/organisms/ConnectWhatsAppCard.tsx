"use client";

import { useActionState, useState } from "react";

import type { ConnectionCardView, WhatsAppConnection } from "@/modules/channels/whatsapp";

type FormState = { ok: boolean; error: string | null };
type CopyState = "idle" | "copied" | "error";

interface ConnectWhatsAppCardProps {
  connection: WhatsAppConnection;
  /** Decisión pura calculada en el servidor para no cargar el módulo en el cliente. */
  view: ConnectionCardView;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

const TONES = {
  ok: "bg-status-done-bg text-status-done-fg",
  warn: "bg-status-pending-bg text-status-pending-fg",
  idle: "bg-status-none-bg text-status-none-fg",
} as const;

const inputClass = "rounded-md border border-border bg-background px-3 py-2 text-sm";

/** Icono del estado: el color y el texto del badge complementan la señal visual. */
function StatusIcon({ tone }: { tone: ConnectionCardView["tone"] }) {
  if (tone === "ok") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tone === "warn") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

/** Tarjeta "WhatsApp del negocio": estado real, formulario y guía para pegar en Meta. */
export function ConnectWhatsAppCard({ connection, view, action }: ConnectWhatsAppCardProps) {
  const [state, formAction, pending] = useActionState(action, { ok: false, error: null });
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const hasPublicUrl = connection.webhookUrl.startsWith("http");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(connection.webhookUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      aria-labelledby="whatsapp-card-title"
      className="flex min-w-0 flex-col gap-4 rounded-3xl border border-surface-2 bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="whatsapp-card-title"
          style={{ fontFamily: "var(--font-display)" }}
          className="text-xl font-semibold text-text"
        >
          WhatsApp del negocio
        </h2>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${TONES[view.tone]}`}
        >
          <StatusIcon tone={view.tone} />
          {view.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-2">{view.description}</p>

      {view.showForm ? (
        <form action={formAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Número visible de WhatsApp
            <input
              name="displayPhone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="+5215512345678"
              defaultValue={connection.displayPhone ?? ""}
              aria-describedby="whatsapp-displayPhone-hint"
              className={inputClass}
            />
          </label>
          <p id="whatsapp-displayPhone-hint" className="text-xs text-text-2">
            Escribe el número con código de país, tal como aparece en WhatsApp.
          </p>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.ok && <p className="text-sm text-status-done-fg">Número guardado.</p>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-fit items-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-canvas disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar número"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-text-2">
          Número conectado:{" "}
          <span className="font-semibold text-text">{connection.displayPhone ?? "tu número"}</span>
        </p>
      )}

      <div className="min-w-0 rounded-2xl bg-card p-4">
        <h3 className="text-sm font-semibold text-text">
          {view.showForm ? "Pega esto en Meta" : "URL del webhook"}
        </h3>
        <p className="mt-2 text-xs text-text-2">
          {view.showForm ? "URL del webhook (Callback URL):" : "Callback URL:"}
        </p>
        <code className="mt-1 block break-all text-sm text-text">{connection.webhookUrl}</code>
        {!hasPublicUrl && (
          <p className="mt-2 text-xs leading-relaxed text-text-2">
            No hay URL pública configurada. Antepón el dominio de tu despliegue a esta ruta antes de
            usarla en Meta.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-canvas transition-colors hover:bg-accent-hover"
          >
            {copyState === "copied" ? "URL copiada" : "Copiar URL del webhook"}
          </button>
          <div role="status" aria-live="polite" className="min-h-5 text-sm">
            {copyState === "copied" ? (
              <span className="sr-only">URL del webhook copiada al portapapeles.</span>
            ) : null}
            {copyState === "error" ? (
              <span className="text-destructive">
                No se pudo copiar. Selecciona la URL y cópiala manualmente.
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 text-sm text-text-2">
          <StatusIcon tone={connection.verifyTokenConfigured ? "ok" : "warn"} />
          <span>
            Token de verificación:{" "}
            {connection.verifyTokenConfigured
              ? "configurado. Es secreto; no se muestra ni se copia."
              : "pendiente de configurar en el servidor."}
          </span>
        </p>
        {view.showForm && (
          <p className="mt-2 text-sm text-text-2">
            Después de verificar, suscribe el campo{" "}
            <strong className="font-semibold text-text">messages</strong> del webhook.
          </p>
        )}
      </div>
    </section>
  );
}
