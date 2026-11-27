import { describe, expect, it } from "vitest";

import { getAuthRedirect } from "./auth-redirect";

describe("getAuthRedirect", () => {
  it("redirige al login cuando no hay sesión en una ruta protegida", () => {
    expect(getAuthRedirect("/contacts", false)).toBe("/login");
  });

  it("redirige al login cuando no hay sesión en la raíz", () => {
    expect(getAuthRedirect("/", false)).toBe("/login");
  });

  it("permite el login sin sesión", () => {
    expect(getAuthRedirect("/login", false)).toBeNull();
  });

  it("redirige al inicio del dashboard cuando ya hay sesión y se visita el login", () => {
    expect(getAuthRedirect("/login", true)).toBe("/home");
  });

  it("permite una ruta protegida cuando hay sesión", () => {
    expect(getAuthRedirect("/home", true)).toBeNull();
  });

  it("trata las rutas de auth como públicas", () => {
    expect(getAuthRedirect("/api/auth/callback", false)).toBeNull();
  });

  it("permite el registro sin sesión", () => {
    expect(getAuthRedirect("/signup", false)).toBeNull();
  });

  it("redirige al inicio del dashboard cuando ya hay sesión y se visita el registro", () => {
    expect(getAuthRedirect("/signup", true)).toBe("/home");
  });
});
