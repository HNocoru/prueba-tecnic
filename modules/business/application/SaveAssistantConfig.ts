import { assistantConfigInputSchema } from "./validation";
import type { BusinessRepository } from "./ports";

export type SaveResult = { ok: true } | { ok: false; error: string };

export class SaveAssistantConfig {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string, input: unknown): Promise<SaveResult> {
    const parsed = assistantConfigInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    try {
      await this.repository.upsertAssistantConfig(tenantId, parsed.data);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "No se pudo guardar la configuración del asistente. Inténtalo de nuevo.",
      };
    }
  }
}
