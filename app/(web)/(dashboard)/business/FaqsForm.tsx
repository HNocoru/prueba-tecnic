"use client";

import { useActionState, useState } from "react";
import { saveFaqsAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = { ok: false, message: null };

type FaqRow = { question: string; answer: string; position: number };

type Props = { initialValues: Array<{ question: string; answer: string; position: number }> };

function normalize(rows: FaqRow[]): FaqRow[] {
  return rows.map((r, i) => ({ ...r, position: i }));
}

export function FaqsForm({ initialValues }: Props) {
  const [rows, setRows] = useState<FaqRow[]>(
    normalize(initialValues.slice().sort((a, b) => a.position - b.position)),
  );
  const [state, formAction, pending] = useActionState(saveFaqsAction, initialState);

  function updateRow(index: number, patch: Partial<FaqRow>) {
    setRows((prev) => normalize(prev.map((r, i) => (i === index ? { ...r, ...patch } : r))));
  }
  function addRow() {
    setRows((prev) => normalize([...prev, { question: "", answer: "", position: prev.length }]));
  }
  function removeRow(index: number) {
    setRows((prev) => normalize(prev.filter((_, i) => i !== index)));
  }
  function move(index: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(target, 0, item);
      return normalize(next);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-4xl">
      <input type="hidden" name="faqs" value={JSON.stringify(rows)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-md border border-border bg-card p-3 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Pregunta {index + 1}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded-md border border-border px-2 py-1 text-sm text-foreground hover:bg-surface"
                  aria-label={`Subir pregunta ${index + 1}`}
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded-md border border-border px-2 py-1 text-sm text-foreground hover:bg-surface"
                  aria-label={`Bajar pregunta ${index + 1}`}
                >
                  Bajar
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-md border border-border px-2 py-1 text-sm text-foreground hover:bg-surface"
                >
                  Borrar
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor={`q-${index}`}>
                Pregunta
              </label>
              <input
                id={`q-${index}`}
                value={row.question}
                onChange={(e) => updateRow(index, { question: e.target.value })}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor={`a-${index}`}>
                Respuesta
              </label>
              <textarea
                id={`a-${index}`}
                value={row.answer}
                onChange={(e) => updateRow(index, { answer: e.target.value })}
                rows={3}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
        >
          Agregar pregunta
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar preguntas frecuentes"}
        </button>
      </div>
      {state.message ? (
        <p
          className={state.ok ? "text-sm text-status-done-fg" : "text-sm text-status-cancelled-fg"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
