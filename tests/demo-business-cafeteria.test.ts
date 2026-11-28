import { describe, expect, it } from "vitest";

import {
  assistantConfigInputSchema,
  businessHoursListSchema,
  businessProfileInputSchema,
  catalogItemInputSchema,
  faqInputSchema,
} from "@/modules/business/application/validation";

import {
  CAFETERIA_ASSISTANT,
  CAFETERIA_CATALOG,
  CAFETERIA_FAQS,
  CAFETERIA_HOURS,
  CAFETERIA_PROFILE,
  // @ts-expect-error TS5097: Node exige la extensión .mts en el import.
} from "../scripts/demo-business-cafeteria.mts";

describe("preset cafeteria", () => {
  it("el perfil pasa el esquema del módulo", () => {
    expect(businessProfileInputSchema.safeParse(CAFETERIA_PROFILE).success).toBe(true);
    expect(CAFETERIA_PROFILE.contactPhone).toMatch(/^961 555 01\d\d$/);
  });

  it("los horarios pasan el esquema y cubren los 7 días (0 = domingo)", () => {
    expect(businessHoursListSchema.safeParse(CAFETERIA_HOURS).success).toBe(true);
    const days = CAFETERIA_HOURS.map((h: { weekday: number }) => h.weekday).sort();
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const sunday = CAFETERIA_HOURS.find((h: { weekday: number }) => h.weekday === 0);
    expect(sunday).toMatchObject({ opens: "08:00", closes: "15:00" });
  });

  it("el catálogo pasa el esquema, es activo y tiene nombres únicos", () => {
    expect(CAFETERIA_CATALOG.length).toBeGreaterThanOrEqual(12);
    for (const row of CAFETERIA_CATALOG) {
      const parsed = catalogItemInputSchema.safeParse(row);
      expect(parsed.success, row.name).toBe(true);
      expect(row.active).toBe(true);
    }
    expect(new Set(CAFETERIA_CATALOG.map((r: { name: string }) => r.name)).size).toBe(
      CAFETERIA_CATALOG.length,
    );
  });

  it("las FAQs pasan el esquema", () => {
    expect(CAFETERIA_FAQS.length).toBeGreaterThanOrEqual(8);
    for (const faq of CAFETERIA_FAQS) {
      expect(faqInputSchema.safeParse(faq).success, faq.question).toBe(true);
    }
  });

  it("el asistente pasa el esquema", () => {
    expect(assistantConfigInputSchema.safeParse(CAFETERIA_ASSISTANT).success).toBe(true);
  });
});
