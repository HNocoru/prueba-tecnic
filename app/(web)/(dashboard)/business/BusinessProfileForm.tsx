"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        <Label htmlFor="legalName">Nombre del negocio</Label>
        <Input id="legalName" name="legalName" defaultValue={initialValues.legalName} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialValues.description}
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" defaultValue={initialValues.address} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="timezone">Zona horaria (IANA)</Label>
        <Input
          id="timezone"
          name="timezone"
          defaultValue={initialValues.timezone || "America/Mexico_City"}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="policies">Políticas</Label>
        <Textarea id="policies" name="policies" defaultValue={initialValues.policies} rows={3} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="contactPhone">Teléfono de contacto</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={initialValues.contactPhone} />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando..." : "Guardar perfil"}
      </Button>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
