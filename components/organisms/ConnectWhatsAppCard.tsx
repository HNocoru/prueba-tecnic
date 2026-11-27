"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card asChild className="flex flex-col gap-4 bg-surface p-5 shadow-none sm:p-6">
      <section aria-labelledby="whatsapp-card-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="whatsapp-card-title"
            style={{ fontFamily: "var(--font-display)" }}
            className="text-xl font-semibold text-text"
          >
            {showForm ? "Conecta tu WhatsApp" : "Tu WhatsApp"}
          </h2>
          <Badge
            variant="plain"
            role="status"
            className={`gap-2 px-3 py-1 text-sm font-semibold ${TONES[view.tone]}`}
          >
            <StatusIcon tone={view.tone} />
            {view.label}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-text-2">{view.description}</p>

        {showForm ? (
          <form action={formAction} noValidate className="flex flex-col gap-3">
            <Label htmlFor="whatsapp-number">Número de WhatsApp Business</Label>
            <Input
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
              className="rounded-md border-border bg-background"
            />
            <p id={hintId} className="text-xs leading-relaxed text-text-2">
              Escríbelo con código de país, por ejemplo +52 55 1234 5678. Debe ser un número
              registrado en WhatsApp Business.
            </p>
            {state.error && (
              <p
                id={errorId}
                role="alert"
                aria-live="assertive"
                className="text-sm text-destructive"
              >
                {state.error}
              </p>
            )}
            {state.ok && (
              <p role="status" aria-live="polite" className="text-sm text-status-done-fg">
                Número guardado.
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Conectando…" : "Conectar número"}
            </Button>
          </form>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <p className="min-w-0 break-words text-sm text-text-2">
              Número conectado:{" "}
              <span className="font-semibold text-text">
                {connection.displayPhone ?? "tu número"}
              </span>
            </p>
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Cambiar número
            </Button>
          </div>
        )}
      </section>
    </Card>
  );
}
