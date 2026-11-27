import { businessProfileInputSchema } from "./validation";
import type { BusinessRepository } from "./ports";

export type SaveResult = { ok: true } | { ok: false; error: string };

export class SaveBusinessProfile {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string, input: unknown): Promise<SaveResult> {
    const parsed = businessProfileInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    try {
      await this.repository.upsertProfile(tenantId, parsed.data);
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo guardar el perfil del negocio. Inténtalo de nuevo." };
    }
  }
}
