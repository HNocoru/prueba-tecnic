import type { BusinessRepository } from "./ports";
import type { BusinessProfileRow } from "./ports";

export class GetBusinessProfileRaw {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string): Promise<BusinessProfileRow> {
    return this.repository.getProfile(tenantId);
  }
}
