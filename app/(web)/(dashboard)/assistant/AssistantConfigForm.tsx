"use client";

import { useActionState } from "react";

import { voiceLabel } from "@/components/atoms/p5-presentation";
import { p5FieldClass } from "@/components/atoms/p5-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { P5FormStatus } from "@/components/molecules/P5FormStatus";

import { saveAssistantConfigAction, type AssistantActionState } from "./actions";

const initialState: AssistantActionState = { ok: false, message: null };

type Props = {
  initialValues: {
    name: string;
    tone: string;
    voice: "roberto" | "eduardo";
    language: string;
    greeting: string;
    escalationMessage: string;
  };
};

export function AssistantConfigForm({ initialValues }: Props) {
  const [state, formAction, pending] = useActionState(saveAssistantConfigAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Nombre del asistente</Label>
        <Input id="name" name="name" defaultValue={initialValues.name} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="tone">Tono</Label>
        <Input id="tone" name="tone" defaultValue={initialValues.tone} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="voice">Voz para llamadas</Label>
        <select id="voice" name="voice" defaultValue={initialValues.voice} className={p5FieldClass}>
          <option value="roberto">{voiceLabel("roberto")}</option>
          <option value="eduardo">{voiceLabel("eduardo")}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="language">Idioma</Label>
        <Input
          id="language"
          name="language"
          defaultValue={initialValues.language}
          aria-describedby="language-note"
        />
        <p id="language-note" className="text-xs text-text-2">
          Español de México.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="greeting">Saludo inicial</Label>
        <Textarea id="greeting" name="greeting" defaultValue={initialValues.greeting} rows={3} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="escalationMessage">Mensaje de escalamiento</Label>
        <Textarea
          id="escalationMessage"
          name="escalationMessage"
          defaultValue={initialValues.escalationMessage}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
