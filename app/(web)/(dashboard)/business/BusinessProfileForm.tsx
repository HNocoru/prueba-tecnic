"use client";

import { useActionState } from "react";

import {
  p5FieldClass,
  p5LabelClass,
  p5PrimaryButtonClass,
  p5TextareaClass,
} from "@/components/atoms/p5-styles";
import { P5FormStatus } from "@/components/molecules/P5FormStatus";

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
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="legalName" className={p5LabelClass}>
          Nombre del negocio
        </label>
        <input
          id="legalName"
          name="legalName"
          defaultValue={initialValues.legalName}
          className={p5FieldClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={p5LabelClass}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={initialValues.description}
          rows={3}
          className={p5TextareaClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className={p5LabelClass}>
          Dirección
        </label>
        <input
          id="address"
          name="address"
          defaultValue={initialValues.address}
          className={p5FieldClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className={p5LabelClass}>
          Zona horaria (IANA)
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={initialValues.timezone || "America/Mexico_City"}
          className={p5FieldClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="policies" className={p5LabelClass}>
          Políticas
        </label>
        <textarea
          id="policies"
          name="policies"
          defaultValue={initialValues.policies}
          rows={3}
          className={p5TextareaClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="contactPhone" className={p5LabelClass}>
          Teléfono de contacto
        </label>
        <input
          id="contactPhone"
          name="contactPhone"
          defaultValue={initialValues.contactPhone}
          className={p5FieldClass}
        />
      </div>
      <button type="submit" disabled={pending} className={`${p5PrimaryButtonClass} w-fit`}>
        {pending ? "Guardando..." : "Guardar perfil"}
      </button>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
