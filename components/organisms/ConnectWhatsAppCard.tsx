"use client";

import { useActionState } from "react";

import type { ConnectionCardView, WhatsAppConnection } from "@/modules/channels/whatsapp";

type FormState = { ok: boolean; error: string | null };

interface ConnectWhatsAppCardProps {
  connection: WhatsAppConnection;
  /** Decisión pura calculada en el servidor para no cargar el módulo en el cliente. */
  view: ConnectionCardView;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

const TONES = {
  ok: "border-green-600 text-green-700",
  warn: "border-amber-500 text-amber-700",
  idle: "border-border text-muted-foreground",
} as const;

const inputClass = "rounded-md border border-border bg-background px-3 py-2 text-sm";

/** Tarjeta "Conectar WhatsApp": estado real, formulario y guía para pegar en Meta. */
export function ConnectWhatsAppCard({ connection, view, action }: ConnectWhatsAppCardProps) {
  const [state, formAction, pending] = useActionState(action, { ok: false, error: null });
  const hasPublicUrl = connection.webhookUrl.startsWith("http");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Conectar WhatsApp</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${TONES[view.tone]}`}>
          {view.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{view.description}</p>

      {view.showForm && (
        <form action={formAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Número visible
            <input
              name="displayPhone"
              type="tel"
              required
              placeholder="+5215512345678"
              defaultValue={connection.displayPhone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            ID del número (phone_number_id)
            <input
              name="phoneNumberId"
              inputMode="numeric"
              required
              placeholder="123456789012345"
              defaultValue={connection.phoneNumberId ?? ""}
              className={inputClass}
            />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.ok && <p className="text-sm text-green-700">Número guardado.</p>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar número"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2 rounded-md border border-border p-4 text-sm">
        <h3 className="font-medium text-foreground">Pega esto en Meta</h3>
        <p className="text-muted-foreground">URL del webhook (Callback URL):</p>
        <code className="break-all rounded bg-muted px-2 py-1">{connection.webhookUrl}</code>
        {!hasPublicUrl && (
          <p className="text-xs text-muted-foreground">
            Nota: no hay URL pública configurada (NEXT_PUBLIC_APP_URL); antepón el dominio de tu
            despliegue a esta ruta.
          </p>
        )}
        <p className="text-muted-foreground">
          {connection.verifyTokenConfigured
            ? "Token de verificación: usa el valor de WHATSAPP_VERIFY_TOKEN configurado en el servidor."
            : "Falta configurar WHATSAPP_VERIFY_TOKEN en el servidor."}
        </p>
        <p className="text-muted-foreground">
          Después de verificar, suscribe el campo <strong>messages</strong> del webhook.
        </p>
      </div>
    </section>
  );
}
