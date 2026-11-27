import { faqInputSchema } from "./validation";
import type { BusinessRepository } from "./ports";
import type { FaqInput } from "./validation";

export type SaveResult = { ok: true } | { ok: false; error: string };

export class SaveFaqs {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string, input: unknown): Promise<SaveResult> {
    if (!Array.isArray(input))
      return { ok: false, error: "Formato de preguntas frecuentes inválido." };
    const parsedFaqs: FaqInput[] = [];
    for (const item of input) {
      const parsed = faqInputSchema.safeParse(item);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
      }
      parsedFaqs.push(parsed.data);
    }
    try {
      await this.repository.replaceFaqs(tenantId, parsedFaqs);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "No se pudieron guardar las preguntas frecuentes. Inténtalo de nuevo.",
      };
    }
  }
}
