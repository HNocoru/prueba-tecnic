import { describe, expect, it } from "vitest";

import {
  findEquivalentOpenRequest,
  normalizeRequestTitle,
  resolveCatalogAmount,
} from "./RequestClassification";

const catalog = [
  { name: "Corte de cabello", price: 250, currency: "MXN" },
  { name: "Tinte", price: null, currency: "MXN" },
];

const open = [{ id: "r1", title: "Corte de cabello", status: "pending" as const, amount: 250 }];

describe("RequestClassification domain", () => {
  it("normaliza títulos para comparar equivalencias", () => {
    expect(normalizeRequestTitle("  Corte   de  cabello ")).toBe("corte de cabello");
    expect(findEquivalentOpenRequest(open, " corte de cabello")?.id).toBe("r1");
  });

  it("resuelve importe solo desde catálogo", () => {
    expect(resolveCatalogAmount(catalog, "Corte de cabello")).toBe(250);
    expect(resolveCatalogAmount(catalog, "Algo inexistente")).toBeNull();
  });
});
