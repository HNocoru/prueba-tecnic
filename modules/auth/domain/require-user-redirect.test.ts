import { describe, expect, it } from "vitest";

import { getRequireUserRedirect } from "./require-user-redirect";

describe("getRequireUserRedirect", () => {
  it("redirige al login cuando no hay usuario", () => {
    expect(getRequireUserRedirect(false)).toBe("/login");
  });

  it("no redirige cuando hay usuario", () => {
    expect(getRequireUserRedirect(true)).toBeNull();
  });
});
