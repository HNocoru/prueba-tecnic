"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { ConnectionCardView, WhatsAppConnection } from "@/modules/channels/whatsapp";

type FormState = { ok: boolean; error: string | null };

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

const inputClass =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

const hintId = "whatsapp-number-hint";
const errorId = "whatsapp-number-error";

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

/** Tarjeta de conexión: la persona solo escribe su número de WhatsApp Business. */
export function ConnectWhatsAppCard({ connection, view, action }: ConnectWhatsAppCardProps) {
  const [state, formAction, pending] = useActionState(action, { ok: false, error: null });
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const showForm = view.showForm || editing;
  const describedBy = state.error ? `${hintId} ${errorId}` : hintId;

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
          {showForm ? "Conecta tu WhatsApp" : "Tu WhatsApp"}
        </h2>
        <span
          role="status"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${TONES[view.tone]}`}
        >
          <StatusIcon tone={view.tone} />
          {view.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-2">{view.description}</p>

      {showForm ? (
        <form action={formAction} noValidate className="flex flex-col gap-3">
          <label htmlFor="whatsapp-number" className="text-sm font-medium text-text">
            Número de WhatsApp Business
          </label>
          <input
            ref={inputRef}
            id="whatsapp-number"
            name="displayPhone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+52 55 1234 5678"
            defaultValue={connection.displayPhone ?? ""}
            aria-describedby={describedBy}
            aria-invalid={state.error ? true : undefined}
            className={inputClass}
          />
          <p id={hintId} className="text-xs leading-relaxed text-text-2">
            Escríbelo con código de país, por ejemplo +52 55 1234 5678. Debe ser un número
            registrado en WhatsApp Business.
          </p>
          {state.error && (
            <p id={errorId} role="alert" aria-live="assertive" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p role="status" aria-live="polite" className="text-sm text-status-done-fg">
              Número guardado.
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-canvas disabled:opacity-60"
          >
            {pending ? "Conectando…" : "Conectar número"}
          </button>
        </form>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 break-words text-sm text-text-2">
            Número conectado:{" "}
            <span className="font-semibold text-text">
              {connection.displayPhone ?? "tu número"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
          >
            Cambiar número
          </button>
        </div>
      )}
    </section>
  );
}
