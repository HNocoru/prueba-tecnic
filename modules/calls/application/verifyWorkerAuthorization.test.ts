import { describe, expect, it } from "vitest";

import { verifyWorkerAuthorization } from "./verifyWorkerAuthorization";

describe("verifyWorkerAuthorization", () => {
  const token = "token-de-prueba";

  it("acepta el Bearer exacto", () => {
    expect(verifyWorkerAuthorization(`Bearer ${token}`, token)).toBe(true);
  });

  it("rechaza un token distinto, vacío o de otra longitud", () => {
    expect(verifyWorkerAuthorization("Bearer otro", token)).toBe(false);
    expect(verifyWorkerAuthorization("Bearer ", token)).toBe(false);
    expect(verifyWorkerAuthorization(`Bearer ${token}x`, token)).toBe(false);
  });

  it("rechaza cabeceras ausentes o con otro esquema", () => {
    expect(verifyWorkerAuthorization(null, token)).toBe(false);
    expect(verifyWorkerAuthorization(`Basic ${token}`, token)).toBe(false);
    expect(verifyWorkerAuthorization(token, token)).toBe(false);
  });

  it("rechaza si el token esperado está vacío", () => {
    expect(verifyWorkerAuthorization("Bearer ", "")).toBe(false);
  });
});
