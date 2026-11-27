"use client";

import { useActionState, useState } from "react";
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
    <form action={formAction} className="flex flex-col gap-4 max-w-4xl">
      <input type="hidden" name="items" value={JSON.stringify(payload)} />
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-md border border-border bg-card p-3 flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground" htmlFor={`kind-${index}`}>
                  Tipo
                </label>
                <select
                  id={`kind-${index}`}
                  value={row.kind}
                  onChange={(e) =>
                    updateRow(index, { kind: e.target.value as "product" | "service" })
                  }
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-1 lg:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor={`name-${index}`}>
                  Nombre
                </label>
                <input
                  id={`name-${index}`}
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={`currency-${index}`}
                >
                  Moneda
                </label>
                <input
                  id={`currency-${index}`}
                  value={row.currency}
                  onChange={(e) => updateRow(index, { currency: e.target.value })}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground" htmlFor={`price-${index}`}>
                  Precio
                </label>
                <input
                  id={`price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(e) => updateRow(index, { price: e.target.value })}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground" htmlFor={`desc-${index}`}>
                  Descripción
                </label>
                <input
                  id={`desc-${index}`}
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(e) => updateRow(index, { active: e.target.checked })}
                />
                Activo
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Borrar
              </button>
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
          Agregar elemento
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar catálogo"}
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
