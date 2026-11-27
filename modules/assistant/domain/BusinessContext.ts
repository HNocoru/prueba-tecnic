/**
 * Contrato del contexto del negocio. Otro carril entregará la implementación real en
 * modules/business; este módulo solo conoce el tipo.
 */
export type BusinessContext = {
  name: string;
  description: string | null;
  address: string | null;
  timezone: string;
  policies: string | null;
  contactPhone: string | null;
  hours: { weekday: number; opens: string; closes: string }[];
  catalog: {
    kind: "product" | "service";
    name: string;
    description: string | null;
    price: number | null;
    currency: string;
  }[];
  faqs: { question: string; answer: string }[];
  assistant: {
    name: string;
    tone: string | null;
    language: string;
    greeting: string | null;
    escalationMessage: string | null;
  };
};
