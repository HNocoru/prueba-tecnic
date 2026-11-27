"use client";

import { useActionState, useState } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";
import {
  p5ActionRowClass,
  p5FieldClass,
  p5LabelClass,
  p5PrimaryButtonClass,
  p5SecondaryButtonClass,
} from "@/components/atoms/p5-styles";
import { P5FormStatus } from "@/components/molecules/P5FormStatus";

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="hours" value={JSON.stringify(rows)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={`${row.weekday}-${index}`}
            className="grid grid-cols-1 gap-3 rounded-2xl bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1">
              <label className={p5LabelClass} htmlFor={`weekday-${index}`}>
                Día
              </label>
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
              <label className={p5LabelClass} htmlFor={`opens-${index}`}>
                Abre
              </label>
              <input
                id={`opens-${index}`}
                type="time"
                className={p5FieldClass}
                value={row.opens}
                onChange={(e) => updateRow(index, { opens: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={p5LabelClass} htmlFor={`closes-${index}`}>
                Cierra
              </label>
              <input
                id={`closes-${index}`}
                type="time"
                className={p5FieldClass}
                value={row.closes}
                onChange={(e) => updateRow(index, { closes: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className={`relative ${p5SecondaryButtonClass} px-3 sm:w-11 sm:justify-center`}
              aria-label={`Quitar horario ${index + 1}`}
            >
              <P5Icon name="trash" className="h-4 w-4 sm:hidden" />
              <span className="sm:sr-only">Quitar</span>
            </button>
          </div>
        ))}
      </div>
      <div className={p5ActionRowClass}>
        <button type="button" onClick={addRow} className={p5SecondaryButtonClass}>
          <P5Icon name="plus" className="h-4 w-4" />
          Agregar horario
        </button>
        <button type="submit" disabled={pending} className={p5PrimaryButtonClass}>
          {pending ? "Guardando..." : "Guardar horarios"}
        </button>
      </div>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
