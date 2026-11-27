"use client";

import { useActionState } from "react";
import { saveBusinessProfileAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = { ok: false, message: null };

type Props = {
  initialValues: {
    legalName: string;
    description: string;
    address: string;
    timezone: string;
    policies: string;
    contactPhone: string;
  };
};

export function BusinessProfileForm({ initialValues }: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="legalName" className="text-sm font-medium text-foreground">
          Nombre legal
        </label>
        <input
          id="legalName"
          name="legalName"
          defaultValue={initialValues.legalName}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={initialValues.description}
          rows={3}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-foreground">
          Dirección
        </label>
        <input
          id="address"
          name="address"
          defaultValue={initialValues.address}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="text-sm font-medium text-foreground">
          Zona horaria (IANA)
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={initialValues.timezone || "America/Mexico_City"}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="policies" className="text-sm font-medium text-foreground">
          Políticas
        </label>
        <textarea
          id="policies"
          name="policies"
          defaultValue={initialValues.policies}
          rows={3}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="contactPhone" className="text-sm font-medium text-foreground">
          Teléfono de contacto
        </label>
        <input
          id="contactPhone"
          name="contactPhone"
          defaultValue={initialValues.contactPhone}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar perfil"}
      </button>
      {state.message ? (
        <p
          className={state.ok ? "text-sm text-status-done-fg" : "text-sm text-status-cancelled-fg"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
