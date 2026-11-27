import { describe, expect, it, vi } from "vitest";
import { SaveFaqs } from "./SaveFaqs";
import type { BusinessRepository } from "./ports";

function repoMock(): BusinessRepository {
  return {
    getProfile: vi.fn(),
    upsertProfile: vi.fn(),
    listHours: vi.fn(),
    replaceHours: vi.fn(),
    listCatalogItems: vi.fn(),
    replaceCatalogItems: vi.fn(),
    listFaqs: vi.fn(),
    replaceFaqs: vi.fn().mockResolvedValue(undefined),
    getAssistantConfig: vi.fn(),
    upsertAssistantConfig: vi.fn(),
  };
}

describe("SaveFaqs", () => {
  it("rechaza FAQ sin pregunta", async () => {
    const repo = repoMock();
    const uc = new SaveFaqs(repo);
    const result = await uc.execute("t1", [{ question: "", answer: "R", position: 0 }]);
    expect(result.ok).toBe(false);
    expect(repo.replaceFaqs).not.toHaveBeenCalled();
  });

  it("guarda FAQs válidas en orden", async () => {
    const repo = repoMock();
    const uc = new SaveFaqs(repo);
    const faqs = [
      { question: "Q1", answer: "A1", position: 0 },
      { question: "Q2", answer: "A2", position: 1 },
    ];
    const result = await uc.execute("t1", faqs);
    expect(result).toEqual({ ok: true });
    expect(repo.replaceFaqs).toHaveBeenCalledWith("t1", faqs);
  });

  it("ignora renglones totalmente vacíos y guarda los demás", async () => {
    const repo = repoMock();
    const faq = { question: "Q", answer: "A", position: 0 };
    const result = await new SaveFaqs(repo).execute("t1", [
      { question: "", answer: "", position: 0 },
      faq,
      { question: "  ", answer: " ", position: 2 },
    ]);
    expect(result).toEqual({ ok: true });
    expect(repo.replaceFaqs).toHaveBeenCalledWith("t1", [faq]);
  });

  it("sigue rechazando un renglón con solo la pregunta", async () => {
    const repo = repoMock();
    const result = await new SaveFaqs(repo).execute("t1", [
      { question: "Q", answer: "", position: 0 },
    ]);
    expect(result).toEqual({ ok: false, error: "La respuesta es obligatoria." });
    expect(repo.replaceFaqs).not.toHaveBeenCalled();
  });
});
