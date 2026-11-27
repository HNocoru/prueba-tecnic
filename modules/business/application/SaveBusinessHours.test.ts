import { describe, expect, it, vi } from "vitest";
import { SaveBusinessHours } from "./SaveBusinessHours";
import type { BusinessRepository } from "./ports";

function repoMock(): BusinessRepository {
  return {
    getProfile: vi.fn(),
    upsertProfile: vi.fn(),
    listHours: vi.fn(),
    replaceHours: vi.fn().mockResolvedValue(undefined),
    listCatalogItems: vi.fn(),
    replaceCatalogItems: vi.fn(),
    listFaqs: vi.fn(),
    replaceFaqs: vi.fn(),
    getAssistantConfig: vi.fn(),
    upsertAssistantConfig: vi.fn(),
  };
}

describe("SaveBusinessHours", () => {
  it("rechaza horarios traslapados", async () => {
    const repo = repoMock();
    const uc = new SaveBusinessHours(repo);
    const result = await uc.execute("t1", [
      { weekday: 1, opens: "09:00", closes: "12:00" },
      { weekday: 1, opens: "11:00", closes: "14:00" },
    ]);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("traslapan") });
    expect(repo.replaceHours).not.toHaveBeenCalled();
  });

  it("guarda horarios válidos", async () => {
    const repo = repoMock();
    const uc = new SaveBusinessHours(repo);
    const result = await uc.execute("t1", [{ weekday: 2, opens: "09:00", closes: "18:00" }]);
    expect(result).toEqual({ ok: true });
    expect(repo.replaceHours).toHaveBeenCalledWith("t1", [
      { weekday: 2, opens: "09:00", closes: "18:00" },
    ]);
  });
});
