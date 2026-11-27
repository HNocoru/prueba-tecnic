"use client";

import { useActionState, useState } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";
import { dropBlankFaqRows, faqIssues } from "@/components/atoms/form-draft";
import { p5ActionRowClass } from "@/components/atoms/p5-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormFeedback, UnsavedChanges } from "@/components/molecules/FormFeedback";
import { useDraftForm } from "@/components/molecules/use-draft-form";

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

  // Las preguntas totalmente vacías no se envían; las demás conservan su orden.
  const payload = dropBlankFaqRows(rows);
  const draft = useDraftForm({ payload, state, issues: faqIssues(rows) });

  return (
    <form action={formAction} onSubmit={draft.handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="faqs" value={JSON.stringify(payload)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const questionError = draft.issueFor(index, "question");
          const answerError = draft.issueFor(index, "answer");
          return (
            <div key={index} className="flex flex-col gap-3 rounded-2xl bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text">Pregunta {index + 1}</p>
                <div className={p5ActionRowClass}>
                  <Button
                    variant="secondary"
                    size="icon"
                    type="button"
                    onClick={() => move(index, -1)}
                    aria-label={`Subir pregunta ${index + 1}`}
                  >
                    <P5Icon name="up" className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    type="button"
                    onClick={() => move(index, 1)}
                    aria-label={`Bajar pregunta ${index + 1}`}
                  >
                    <P5Icon name="down" className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={`Borrar pregunta ${index + 1}`}
                  >
                    <P5Icon name="trash" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`q-${index}`}>Pregunta</Label>
                <Input
                  id={`q-${index}`}
                  value={row.question}
                  onChange={(e) => updateRow(index, { question: e.target.value })}
                  aria-invalid={questionError ? true : undefined}
                  aria-describedby={questionError ? `q-error-${index}` : undefined}
                  className={questionError ? "border-status-cancelled-fg" : undefined}
                />
                <FieldError id={`q-error-${index}`} message={questionError} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`a-${index}`}>Respuesta</Label>
                <Textarea
                  id={`a-${index}`}
                  value={row.answer}
                  onChange={(e) => updateRow(index, { answer: e.target.value })}
                  rows={3}
                  aria-invalid={answerError ? true : undefined}
                  aria-describedby={answerError ? `a-error-${index}` : undefined}
                  className={answerError ? "border-status-cancelled-fg" : undefined}
                />
                <FieldError id={`a-error-${index}`} message={answerError} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={p5ActionRowClass}>
        <Button type="button" onClick={addRow} variant="secondary" size="sm">
          <P5Icon name="plus" className="h-4 w-4" />
          Agregar pregunta
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar preguntas frecuentes"}
        </Button>
        <UnsavedChanges dirty={draft.dirty} />
      </div>
      <FormFeedback feedback={draft.feedback} innerRef={draft.feedbackRef} />
    </form>
  );
}
