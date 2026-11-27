import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("contrato de shadcn/ui", () => {
  it.each(["button", "input", "label", "card", "badge", "textarea"])(
    "components/ui incluye %s",
    (name) => {
      expect(existsSync(join(root, "components/ui", `${name}.tsx`))).toBe(true);
    },
  );

  it("lib/utils exporta cn", () => {
    expect(readFileSync(join(root, "lib/utils.ts"), "utf8")).toContain("export function cn");
  });

  it("package.json ya no depende de MUI ni de Emotion", () => {
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter((name) => /^@mui\/|^@emotion\//.test(name))).toEqual([]);
  });

  it("el proveedor de MUI ya no existe", () => {
    expect(existsSync(join(root, "components/theme/ThemeRegistry.tsx"))).toBe(false);
  });
});
