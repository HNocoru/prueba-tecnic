"use client";

import { useActionState, useState } from "react";
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
    <form action={formAction} className="flex flex-col gap-4 max-w-3xl">
      <input type="hidden" name="hours" value={JSON.stringify(rows)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={`${row.weekday}-${index}`}
            className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor={`weekday-${index}`}>
                Día
              </label>
              <select
                id={`weekday-${index}`}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
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
              <label className="text-sm font-medium text-foreground" htmlFor={`opens-${index}`}>
                Abre
              </label>
              <input
                id={`opens-${index}`}
                type="time"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={row.opens}
                onChange={(e) => updateRow(index, { opens: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor={`closes-${index}`}>
                Cierra
              </label>
              <input
                id={`closes-${index}`}
                type="time"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={row.closes}
                onChange={(e) => updateRow(index, { closes: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
        >
          Agregar horario
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar horarios"}
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
