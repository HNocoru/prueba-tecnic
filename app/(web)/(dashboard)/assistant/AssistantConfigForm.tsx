"use client";

import { useActionState } from "react";
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
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          defaultValue={initialValues.name}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tone" className="text-sm font-medium text-foreground">
          Tono
        </label>
        <input
          id="tone"
          name="tone"
          defaultValue={initialValues.tone}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="voice" className="text-sm font-medium text-foreground">
          Voz
        </label>
        <select
          id="voice"
          name="voice"
          defaultValue={initialValues.voice}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="roberto">Roberto</option>
          <option value="eduardo">Eduardo</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="language" className="text-sm font-medium text-foreground">
          Idioma
        </label>
        <input
          id="language"
          name="language"
          defaultValue={initialValues.language}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="greeting" className="text-sm font-medium text-foreground">
          Saludo
        </label>
        <textarea
          id="greeting"
          name="greeting"
          defaultValue={initialValues.greeting}
          rows={3}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="escalationMessage" className="text-sm font-medium text-foreground">
          Mensaje de escalamiento
        </label>
        <textarea
          id="escalationMessage"
          name="escalationMessage"
          defaultValue={initialValues.escalationMessage}
          rows={3}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar asistente"}
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
