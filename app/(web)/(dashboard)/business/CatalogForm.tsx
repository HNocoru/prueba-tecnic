"use client";

import { useActionState, useState } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";
import { catalogIssues, dropBlankCatalogRows } from "@/components/atoms/form-draft";
import { p5ActionRowClass, p5FieldClass } from "@/components/atoms/p5-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormFeedback, UnsavedChanges } from "@/components/molecules/FormFeedback";
import { useDraftForm } from "@/components/molecules/use-draft-form";

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

  // Los renglones totalmente vacíos no se envían: solo estorban al guardar.
  const payload = dropBlankCatalogRows(rows).map((r) => ({
    kind: r.kind,
    name: r.name.trim(),
    description: r.description.trim() || null,
    price: r.price.trim() === "" ? null : Number(r.price),
    currency: r.currency.trim() || "MXN",
    active: r.active,
  }));

  const draft = useDraftForm({ payload, state, issues: catalogIssues(rows) });

  return (
    <form action={formAction} onSubmit={draft.handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="items" value={JSON.stringify(payload)} />
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-text-2">
            Todavía no agregas nada. Empieza con lo que más te preguntan.
          </p>
        ) : null}
        {rows.map((row, index) => {
          const nameError = draft.issueFor(index, "name");
          return (
            <div key={index} className="flex flex-col gap-3 rounded-2xl bg-surface p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`kind-${index}`}>Tipo</Label>
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
                  <Label htmlFor={`name-${index}`}>Nombre</Label>
                  <Input
                    id={`name-${index}`}
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? `name-error-${index}` : undefined}
                    className={nameError ? "border-status-cancelled-fg" : undefined}
                  />
                  <FieldError id={`name-error-${index}`} message={nameError} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`currency-${index}`}>Moneda</Label>
                  <Input
                    id={`currency-${index}`}
                    value={row.currency}
                    onChange={(e) => updateRow(index, { currency: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`price-${index}`}>Precio</Label>
                  <Input
                    id={`price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(e) => updateRow(index, { price: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`desc-${index}`}>Descripción</Label>
                  <Input
                    id={`desc-${index}`}
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
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
                <Button
                  type="button"
                  onClick={() => removeRow(index)}
                  variant="secondary"
                  size="sm"
                  className="px-3"
                  aria-label={`Borrar elemento ${index + 1}`}
                >
                  <P5Icon name="trash" className="h-4 w-4" />
                  Borrar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className={p5ActionRowClass}>
        <Button type="button" onClick={addRow} variant="secondary" size="sm">
          <P5Icon name="plus" className="h-4 w-4" />
          Agregar producto o servicio
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar catálogo"}
        </Button>
        <UnsavedChanges dirty={draft.dirty} />
      </div>
      <FormFeedback feedback={draft.feedback} innerRef={draft.feedbackRef} />
    </form>
  );
}
