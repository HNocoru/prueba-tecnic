import { businessHoursListSchema } from "./validation";
import type { BusinessRepository } from "./ports";

export type SaveResult = { ok: true } | { ok: false; error: string };

export class SaveBusinessHours {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string, input: unknown): Promise<SaveResult> {
    if (!Array.isArray(input)) return { ok: false, error: "Formato de horarios inválido." };
    const parsed = businessHoursListSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    try {
      await this.repository.replaceHours(tenantId, parsed.data);
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudieron guardar los horarios. Inténtalo de nuevo." };
    }
  }
}
