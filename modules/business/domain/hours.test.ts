import { describe, expect, it } from "vitest";

import { toHourMinute } from "./hours";

describe("toHourMinute", () => {
  it("quita los segundos que devuelve Postgres", () => {
    expect(toHourMinute("08:00:00")).toBe("08:00");
    expect(toHourMinute("21:30:00.000")).toBe("21:30");
  });
  it("deja intacto lo que ya viene como HH:MM o no es una hora", () => {
    expect(toHourMinute("07:45")).toBe("07:45");
    expect(toHourMinute("cerrado")).toBe("cerrado");
  });
});
