import type { BusinessRepository } from "./ports";
import type { BusinessContext } from "../domain/BusinessContext";

export class GetBusinessContext {
  constructor(private readonly repository: BusinessRepository) {}

  async execute(tenantId: string): Promise<BusinessContext> {
    const [profile, hours, catalog, faqs, assistant] = await Promise.all([
      this.repository.getProfile(tenantId),
      this.repository.listHours(tenantId),
      this.repository.listCatalogItems(tenantId),
      this.repository.listFaqs(tenantId),
      this.repository.getAssistantConfig(tenantId),
    ]);

    return {
      name: profile.legalName ?? assistant.name,
      description: profile.description,
      address: profile.address,
      timezone: profile.timezone,
      policies: profile.policies,
      contactPhone: profile.contactPhone,
      hours: hours
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((h) => ({ weekday: h.weekday, opens: h.opens, closes: h.closes })),
      catalog: catalog.map((c) => ({
        kind: c.kind,
        name: c.name,
        description: c.description,
        price: c.price,
        currency: c.currency,
      })),
      faqs: faqs
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((f) => ({ question: f.question, answer: f.answer })),
      assistant: {
        name: assistant.name,
        tone: assistant.tone,
        voice: assistant.voice,
        language: assistant.language,
        greeting: assistant.greeting,
        escalationMessage: assistant.escalationMessage,
      },
    };
  }
}
