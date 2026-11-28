import { describe, expect, it } from "vitest";

import { cleanSecret } from "./cleanSecret";

describe("cleanSecret", () => {
  it("quita espacios y saltos de línea de los extremos", () => {
    expect(cleanSecret("X", "  gsk_abc123 \r\n")).toBe("gsk_abc123");
  });

  it("rechaza caracteres no ASCII y nombra la variable y la posición, no el valor", () => {
    expect(() => cleanSecret("GROQ_API_KEY", "gsk_ab…cd")).toThrow(
      /GROQ_API_KEY tiene un carácter no válido en la posición 7/,
    );
    try {
      cleanSecret("GROQ_API_KEY", "gsk_ab…cd");
    } catch (error) {
      expect((error as Error).message).not.toContain("gsk_ab");
    }
  });

  it("rechaza espacios internos", () => {
    expect(() => cleanSecret("T", "abc def")).toThrow(/posición 4/);
  });
});
