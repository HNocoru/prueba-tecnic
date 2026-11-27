import type {
  AssistantConfigInput,
  BusinessHoursInput,
  BusinessProfileInput,
  CatalogItemInput,
  FaqInput,
} from "./validation";

export type BusinessProfileRow = {
  legalName: string | null;
  description: string | null;
  address: string | null;
  timezone: string;
  policies: string | null;
  contactPhone: string | null;
};

export type AssistantConfigRow = {
  name: string;
  tone: string | null;
  voice: "roberto" | "eduardo";
  language: string;
  greeting: string | null;
  escalationMessage: string | null;
};

export interface BusinessRepository {
  getProfile(tenantId: string): Promise<BusinessProfileRow>;
  upsertProfile(tenantId: string, input: BusinessProfileInput): Promise<void>;

  listHours(tenantId: string): Promise<{ weekday: number; opens: string; closes: string }[]>;
  replaceHours(tenantId: string, hours: BusinessHoursInput[]): Promise<void>;

  listCatalogItems(tenantId: string): Promise<
    {
      id: string;
      kind: "product" | "service";
      name: string;
      description: string | null;
      price: number | null;
      currency: string;
      active: boolean;
    }[]
  >;
  replaceCatalogItems(tenantId: string, items: CatalogItemInput[]): Promise<void>;

  listFaqs(
    tenantId: string,
  ): Promise<{ id: string; question: string; answer: string; position: number }[]>;
  replaceFaqs(tenantId: string, faqs: FaqInput[]): Promise<void>;

  getAssistantConfig(tenantId: string): Promise<AssistantConfigRow>;
  upsertAssistantConfig(tenantId: string, input: AssistantConfigInput): Promise<void>;
}
