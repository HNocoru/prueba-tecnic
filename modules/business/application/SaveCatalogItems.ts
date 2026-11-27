import { isBlankCatalogRow, catalogItemInputSchema } from "./validation";
import type { BusinessRepository } from "./ports";
import type { CatalogItemInput } from "./validation";

export type SaveResult = { ok: true } | { ok: false; error: string };

export class SaveCatalogItems {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string, input: unknown): Promise<SaveResult> {
    if (!Array.isArray(input)) return { ok: false, error: "Formato de catálogo inválido." };
    const parsedItems: CatalogItemInput[] = [];
    for (const item of input) {
      if (isBlankCatalogRow(item)) continue;
      const parsed = catalogItemInputSchema.safeParse(item);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
      }
      parsedItems.push(parsed.data);
    }
    try {
      await this.repository.replaceCatalogItems(tenantId, parsedItems);
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo guardar el catálogo. Inténtalo de nuevo." };
    }
  }
}
