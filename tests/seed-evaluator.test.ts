import { describe, expect, it } from "vitest";

import {
  formatDisplayPhone,
  buildSlug as scriptSlug,
  planNumber,
  // @ts-expect-error TS5097: Node exige la extensión .mts en el import.
} from "../scripts/seed-evaluator-lib.mts";

describe("seed-evaluator-lib", () => {
  it("genera el slug con las mismas reglas que el registro", () => {
    expect(scriptSlug("Café Ñandú", "abcdef12ffff")).toBe("cafe-nandu-abcdef12");
    expect(scriptSlug("¡¡", "abcdef12")).toBe("negocio-abcdef12");
    expect(scriptSlug("x".repeat(80), "abcdef12").length).toBe(49);
  });

  it("formatea el número de prueba", () => {
    expect(formatDisplayPhone("+15551652725")).toBe("+1 555 165 2725");
    expect(formatDisplayPhone("+525512345678")).toBe("+525512345678");
  });

  it("planea el número sin mover uno ajeno", () => {
    const mine = { tenant_id: "t1", phone_number_id: "p1" };
    expect(planNumber("t1", null, null)).toBe("insert");
    expect(planNumber(undefined, null, null)).toBe("insert");
    expect(planNumber("t1", mine, mine)).toBe("update");
    expect(planNumber("t2", mine, null)).toBe("owned-by-other");
    expect(planNumber(undefined, mine, null)).toBe("owned-by-other");
    expect(planNumber("t1", null, mine)).toBe("tenant-has-other-number");
  });
});
