import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "app/(web)/(dashboard)/error.tsx"), "utf8");

describe("límite de error del dashboard", () => {
  it("es un componente de cliente con rol alert", () => {
    expect(source.startsWith('"use client"')).toBe(true);
    expect(source).toContain('role="alert"');
  });

  it("ofrece reintentar y volver a iniciar sesión con POST al logout existente", () => {
    expect(source).toContain("Reintentar");
    expect(source).toContain('action="/api/auth/logout"');
    expect(source).toContain('method="post"');
    expect(source).toContain("Iniciar sesión de nuevo");
  });

  it("no muestra el mensaje ni el digest del error", () => {
    expect(source).not.toMatch(/error\.message|error\.digest|\.stack/);
  });

  it("usa solo clases de color que existen en los tokens", () => {
    expect(source).not.toContain("accent-h ");
    expect(source).toContain("hover:bg-accent-hover");
  });
});
