/**
 * Tipo de contexto del negocio consumido por el chat y el worker.
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
    voice: string;
    language: string;
    greeting: string | null;
    escalationMessage: string | null;
  };
};
