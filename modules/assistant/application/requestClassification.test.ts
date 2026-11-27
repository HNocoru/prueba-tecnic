import { describe, expect, it } from "vitest";

import type { BusinessContext } from "../domain/BusinessContext";
import { decideRequestWrite, parseClassificationOutput } from "./requestClassification";

const context = {
  catalog: [
    { kind: "service", name: "Corte de cabello", description: null, price: 250, currency: "MXN" },
  ],
} as unknown as BusinessContext;

const open = [{ id: "r1", title: "Corte de cabello", status: "pending" as const, amount: 250 }];

describe("requestClassification application", () => {
  it("rechaza JSON inválido", () => {
    expect(parseClassificationOutput("not json")).toBeNull();
  });

  it("no permite crear completed ni estados prohibidos en creación", () => {
    expect(
      decideRequestWrite(
        { action: "create", title: "Corte de cabello", status: "in_progress" },
        [],
        context,
      ),
    ).toBeNull();
  });

  it("crea pending con precio del catálogo", () => {
    expect(
      decideRequestWrite(
        { action: "create", title: "Corte de cabello", status: "pending" },
        [],
        context,
      ),
    ).toEqual({
      action: "create",
      title: "Corte de cabello",
      status: "pending",
      amount: 250,
    });
  });

  it("actualiza solicitud abierta equivalente en vez de duplicar", () => {
    expect(
      decideRequestWrite(
        { action: "create", title: "  corte de cabello ", status: "pending" },
        open,
        context,
      ),
    ).toEqual({
      action: "update",
      requestId: "r1",
      title: "Corte de cabello",
      status: "pending",
      amount: 250,
    });
  });

  it("solo permite pending->in_progress y cancelar; nunca completed", () => {
    expect(
      decideRequestWrite(
        { action: "update", title: "Corte de cabello", status: "in_progress" },
        open,
        context,
      ),
    ).toMatchObject({ action: "update", status: "in_progress" });
    expect(
      decideRequestWrite(
        { action: "update", title: "Corte de cabello", status: "cancelled" },
        open,
        context,
      ),
    ).toMatchObject({ action: "update", status: "cancelled" });
    expect(
      decideRequestWrite(
        { action: "update", title: "Corte de cabello", status: "in_progress" },
        [{ ...open[0], status: "in_progress" }],
        context,
      ),
    ).toBeNull();
  });
});

it("ignora importe del cliente y toma precio solo del catálogo", () => {
  expect(
    decideRequestWrite(
      { action: "create", title: "Corte de cabello", status: "pending" },
      [],
      context,
    ),
  ).toEqual({
    action: "create",
    title: "Corte de cabello",
    status: "pending",
    amount: 250,
  });
  expect(
    decideRequestWrite(
      { action: "create", title: "Servicio inventado", status: "pending" },
      [],
      context,
    ),
  ).toBeNull();
});

it("acción desconocida o JSON inválido no produce escritura", () => {
  expect(parseClassificationOutput('{"action":"delete","title":"x"}')).toBeNull();
  expect(decideRequestWrite(null, open, context)).toBeNull();
});
