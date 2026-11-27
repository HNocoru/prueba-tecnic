"use client";

import { useActionState } from "react";

import { voiceLabel } from "@/components/atoms/p5-presentation";
import {
  p5FieldClass,
  p5LabelClass,
  p5PrimaryButtonClass,
  p5TextareaClass,
} from "@/components/atoms/p5-styles";
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
        <label htmlFor="name" className={p5LabelClass}>
          Nombre del asistente
        </label>
        <input id="name" name="name" defaultValue={initialValues.name} className={p5FieldClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tone" className={p5LabelClass}>
          Tono
        </label>
        <input id="tone" name="tone" defaultValue={initialValues.tone} className={p5FieldClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="voice" className={p5LabelClass}>
          Voz para llamadas
        </label>
        <select id="voice" name="voice" defaultValue={initialValues.voice} className={p5FieldClass}>
          <option value="roberto">{voiceLabel("roberto")}</option>
          <option value="eduardo">{voiceLabel("eduardo")}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="language" className={p5LabelClass}>
          Idioma
        </label>
        <input
          id="language"
          name="language"
          defaultValue={initialValues.language}
          aria-describedby="language-note"
          className={p5FieldClass}
        />
        <p id="language-note" className="text-xs text-text-2">
          Español de México.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="greeting" className={p5LabelClass}>
          Saludo inicial
        </label>
        <textarea
          id="greeting"
          name="greeting"
          defaultValue={initialValues.greeting}
          rows={3}
          className={p5TextareaClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="escalationMessage" className={p5LabelClass}>
          Mensaje de escalamiento
        </label>
        <textarea
          id="escalationMessage"
          name="escalationMessage"
          defaultValue={initialValues.escalationMessage}
          rows={3}
          className={p5TextareaClass}
        />
      </div>
      <button type="submit" disabled={pending} className={`${p5PrimaryButtonClass} w-fit`}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
