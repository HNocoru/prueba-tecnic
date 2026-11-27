import { describe, expect, it, vi } from "vitest";
import { SaveCatalogItems } from "./SaveCatalogItems";
import type { BusinessRepository } from "./ports";

function repoMock(): BusinessRepository {
  return {
    getProfile: vi.fn(),
    upsertProfile: vi.fn(),
    listHours: vi.fn(),
    replaceHours: vi.fn(),
    listCatalogItems: vi.fn(),
    replaceCatalogItems: vi.fn().mockResolvedValue(undefined),
    listFaqs: vi.fn(),
    replaceFaqs: vi.fn(),
    getAssistantConfig: vi.fn(),
    upsertAssistantConfig: vi.fn(),
  };
}

describe("SaveCatalogItems", () => {
  it("rechaza item con precio negativo", async () => {
    const repo = repoMock();
    const uc = new SaveCatalogItems(repo);
    const result = await uc.execute("t1", [
      { kind: "product", name: "A", description: null, price: -5, currency: "MXN", active: true },
    ]);
    expect(result.ok).toBe(false);
    expect(repo.replaceCatalogItems).not.toHaveBeenCalled();
  });

  it("guarda catálogo válido", async () => {
    const repo = repoMock();
    const uc = new SaveCatalogItems(repo);
    const items = [
      {
        kind: "service" as const,
        name: "Corte",
        description: "Desc",
        price: 100,
        currency: "MXN",
        active: true,
      },
    ];
    const result = await uc.execute("t1", items);
    expect(result).toEqual({ ok: true });
    expect(repo.replaceCatalogItems).toHaveBeenCalledWith("t1", items);
  });

  const blank = {
    kind: "product",
    name: "",
    description: null,
    price: null,
    currency: "MXN",
    active: true,
  };
  const valid = {
    kind: "product" as const,
    name: "A",
    description: null,
    price: 5,
    currency: "MXN",
    active: true,
  };

  it("ignora renglones totalmente vacíos y guarda los demás", async () => {
    const repo = repoMock();
    const result = await new SaveCatalogItems(repo).execute("t1", [
      blank,
      valid,
      { ...blank, description: "  " },
    ]);
    expect(result).toEqual({ ok: true });
    expect(repo.replaceCatalogItems).toHaveBeenCalledWith("t1", [valid]);
  });

  it("sigue rechazando un renglón parcialmente lleno", async () => {
    const repo = repoMock();
    const result = await new SaveCatalogItems(repo).execute("t1", [valid, { ...blank, price: 10 }]);
    expect(result).toEqual({ ok: false, error: "El nombre es obligatorio." });
    expect(repo.replaceCatalogItems).not.toHaveBeenCalled();
  });
});
