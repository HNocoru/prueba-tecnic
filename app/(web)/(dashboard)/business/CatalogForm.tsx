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

import { saveCatalogItemsAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = { ok: false, message: null };

type CatalogRow = {
  kind: "product" | "service";
  name: string;
  description: string;
  price: string;
  currency: string;
  active: boolean;
};

type Props = {
  initialValues: Array<{
    kind: "product" | "service";
    name: string;
    description: string | null;
    price: number | null;
    currency: string;
    active: boolean;
  }>;
};

function toRow(item: Props["initialValues"][number]): CatalogRow {
  return {
    kind: item.kind,
    name: item.name,
    description: item.description ?? "",
    price: item.price == null ? "" : String(item.price),
    currency: item.currency || "MXN",
    active: item.active,
  };
}

export function CatalogForm({ initialValues }: Props) {
  const [rows, setRows] = useState<CatalogRow[]>(initialValues.map(toRow));
  const [state, formAction, pending] = useActionState(saveCatalogItemsAction, initialState);

  function updateRow(index: number, patch: Partial<CatalogRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { kind: "service", name: "", description: "", price: "", currency: "MXN", active: true },
    ]);
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const payload = rows.map((r) => ({
    kind: r.kind,
    name: r.name.trim(),
    description: r.description.trim() || null,
    price: r.price.trim() === "" ? null : Number(r.price),
    currency: r.currency.trim() || "MXN",
    active: r.active,
  }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="items" value={JSON.stringify(payload)} />
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-text-2">
            Todavía no agregas nada. Empieza con lo que más te preguntan.
          </p>
        ) : null}
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-surface p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className={p5LabelClass} htmlFor={`kind-${index}`}>
                  Tipo
                </label>
                <select
                  id={`kind-${index}`}
                  value={row.kind}
                  onChange={(e) =>
                    updateRow(index, { kind: e.target.value as "product" | "service" })
                  }
                  className={p5FieldClass}
                >
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label className={p5LabelClass} htmlFor={`name-${index}`}>
                  Nombre
                </label>
                <input
                  id={`name-${index}`}
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  className={p5FieldClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={p5LabelClass} htmlFor={`currency-${index}`}>
                  Moneda
                </label>
                <input
                  id={`currency-${index}`}
                  value={row.currency}
                  onChange={(e) => updateRow(index, { currency: e.target.value })}
                  className={p5FieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={p5LabelClass} htmlFor={`price-${index}`}>
                  Precio
                </label>
                <input
                  id={`price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(e) => updateRow(index, { price: e.target.value })}
                  className={p5FieldClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={p5LabelClass} htmlFor={`desc-${index}`}>
                  Descripción
                </label>
                <input
                  id={`desc-${index}`}
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  className={p5FieldClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-accent"
                  checked={row.active}
                  onChange={(e) => updateRow(index, { active: e.target.checked })}
                />
                Disponible
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className={`${p5SecondaryButtonClass} px-3`}
                aria-label={`Borrar elemento ${index + 1}`}
              >
                <P5Icon name="trash" className="h-4 w-4" />
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className={p5ActionRowClass}>
        <button type="button" onClick={addRow} className={p5SecondaryButtonClass}>
          <P5Icon name="plus" className="h-4 w-4" />
          Agregar producto o servicio
        </button>
        <button type="submit" disabled={pending} className={p5PrimaryButtonClass}>
          {pending ? "Guardando..." : "Guardar catálogo"}
        </button>
      </div>
      <P5FormStatus message={state.message} ok={state.ok} />
    </form>
  );
}
