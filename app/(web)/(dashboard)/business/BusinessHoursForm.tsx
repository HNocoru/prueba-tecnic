"use client";

import { useActionState, useState } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";
import { dropBlankHourRows, hourIssues } from "@/components/atoms/form-draft";
import { p5ActionRowClass, p5FieldClass } from "@/components/atoms/p5-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormFeedback, UnsavedChanges } from "@/components/molecules/FormFeedback";
import { useDraftForm } from "@/components/molecules/use-draft-form";

import { saveBusinessHoursAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = { ok: false, message: null };

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type HourRow = { weekday: number; opens: string; closes: string };

type Props = { initialValues: HourRow[] };

export function BusinessHoursForm({ initialValues }: Props) {
  const [rows, setRows] = useState<HourRow[]>(
    initialValues.length > 0 ? initialValues.slice().sort((a, b) => a.weekday - b.weekday) : [],
  );
  const [state, formAction, pending] = useActionState(saveBusinessHoursAction, initialState);

  function updateRow(index: number, patch: Partial<HourRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { weekday: 1, opens: "09:00", closes: "18:00" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  // Los horarios sin ninguna hora no se envían.
  const payload = dropBlankHourRows(rows);
  const draft = useDraftForm({ payload, state, issues: hourIssues(rows) });

  return (
    <form action={formAction} onSubmit={draft.handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="hours" value={JSON.stringify(payload)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const opensError = draft.issueFor(index, "opens");
          const closesError = draft.issueFor(index, "closes");
          return (
            <div
              key={`${row.weekday}-${index}`}
              className="grid grid-cols-1 gap-3 rounded-2xl bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor={`weekday-${index}`}>Día</Label>
                <select
                  id={`weekday-${index}`}
                  className={p5FieldClass}
                  value={row.weekday}
                  onChange={(e) => updateRow(index, { weekday: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((label, value) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`opens-${index}`}>Abre</Label>
                <Input
                  id={`opens-${index}`}
                  type="time"
                  value={row.opens}
                  onChange={(e) => updateRow(index, { opens: e.target.value })}
                  aria-invalid={opensError ? true : undefined}
                  aria-describedby={opensError ? `opens-error-${index}` : undefined}
                  className={opensError ? "border-status-cancelled-fg" : undefined}
                />
                <FieldError id={`opens-error-${index}`} message={opensError} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`closes-${index}`}>Cierra</Label>
                <Input
                  id={`closes-${index}`}
                  type="time"
                  value={row.closes}
                  onChange={(e) => updateRow(index, { closes: e.target.value })}
                  aria-invalid={closesError ? true : undefined}
                  aria-describedby={closesError ? `closes-error-${index}` : undefined}
                  className={closesError ? "border-status-cancelled-fg" : undefined}
                />
                <FieldError id={`closes-error-${index}`} message={closesError} />
              </div>
              <Button
                type="button"
                onClick={() => removeRow(index)}
                variant="secondary"
                size="sm"
                className="relative px-3 sm:w-11 sm:justify-center"
                aria-label={`Quitar horario ${index + 1}`}
              >
                <P5Icon name="trash" className="h-4 w-4 sm:hidden" />
                <span className="sm:sr-only">Quitar</span>
              </Button>
            </div>
          );
        })}
      </div>
      <div className={p5ActionRowClass}>
        <Button type="button" onClick={addRow} variant="secondary" size="sm">
          <P5Icon name="plus" className="h-4 w-4" />
          Agregar horario
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar horarios"}
        </Button>
        <UnsavedChanges dirty={draft.dirty} />
      </div>
      <FormFeedback feedback={draft.feedback} innerRef={draft.feedbackRef} />
    </form>
  );
}
