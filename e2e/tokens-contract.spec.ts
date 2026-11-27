import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test } from "@playwright/test";

const tokensPath = resolve(process.cwd(), "components/theme/tokens.ts");
const globalsPath = resolve(process.cwd(), "app/globals.css");

/** Valores de la dirección A tomados del handoff S08; la prueba es la fuente independiente. */
const expectedVariables: Record<string, string> = {
  "--color-canvas": "#FFFFFF",
  "--color-card": "#FFFFFF",
  "--color-surface": "#F7F4F1",
  "--color-surface-2": "#EFE9E3",
  "--color-text": "#222222",
  "--color-text-2": "#6A6560",
  "--color-accent": "#C8274A",
  "--color-accent-hover": "#B01F3F",
  "--color-soft": "#FCE8EC",
  "--color-hero": "#FFE0E5",
  "--color-status-none-fg": "#5F5A55",
  "--color-status-none-bg": "#EFEBE7",
  "--color-status-pending-fg": "#8A5A00",
  "--color-status-pending-bg": "#FFF3D6",
  "--color-status-progress-fg": "#0B4FB3",
  "--color-status-progress-bg": "#E3EEFF",
  "--color-status-done-fg": "#1B6B3A",
  "--color-status-done-bg": "#E1F4E8",
  "--color-status-cancelled-fg": "#A3162F",
  "--color-status-cancelled-bg": "#FDE3E7",
};

function themeBlock(css: string): string {
  const match = css.match(/@theme(?:\s+inline)?\s*\{([\s\S]*?)\}/);
  return match?.[1] ?? "";
}

test.describe("contrato de tokens", () => {
  test("tokens.ts y el bloque @theme exponen los mismos colores de la dirección A", async () => {
    expect(existsSync(tokensPath), "components/theme/tokens.ts debe existir").toBe(true);

    const tokenModule = (await import(pathToFileURL(tokensPath).href)) as {
      cssColorVariables?: Record<string, string>;
    };
    expect(
      tokenModule.cssColorVariables,
      "tokens.ts debe exportar cssColorVariables",
    ).toBeDefined();

    const declared = tokenModule.cssColorVariables ?? {};
    expect(Object.keys(declared).sort()).toEqual(Object.keys(expectedVariables).sort());
    for (const [name, value] of Object.entries(expectedVariables)) {
      expect(declared[name], `valor de ${name} en tokens.ts`).toBe(value);
    }

    const css = await readFile(globalsPath, "utf8");
    const block = themeBlock(css);
    expect(block, "app/globals.css debe tener un bloque @theme").not.toBe("");

    const inCss = new Map(
      [...block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((match) => [
        match[1],
        match[2].toUpperCase(),
      ]),
    );
    for (const [name, value] of Object.entries(expectedVariables)) {
      expect(inCss.get(name), `${name} en el bloque @theme`).toBe(value);
    }
  });

  test("no hay colores literales fuera de tokens.ts y del bloque @theme", async () => {
    const css = await readFile(globalsPath, "utf8");
    const outside = css.replace(/@theme(?:\s+inline)?\s*\{[\s\S]*?\}/g, "");
    expect(outside.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).toEqual([]);
  });
});
