import { describe, expect, it } from "vitest";

import { decideConnectionCard } from "./connectionCard";

describe("decideConnectionCard", () => {
  it("conectado", () => {
    expect(decideConnectionCard("connected", "+5215512345678")).toMatchObject({
      label: "Conectado",
      tone: "ok",
      showForm: false,
    });
  });
  it("pendiente: espera el primer mensaje y permite cambiar el número", () => {
    expect(decideConnectionCard("pending", "+5215512345678")).toMatchObject({
      label: "Listo: esperando tu primer mensaje",
      tone: "warn",
      showForm: false,
    });
  });
  it("no conectado", () => {
    expect(decideConnectionCard("not_connected", null)).toMatchObject({
      label: "No conectado",
      tone: "idle",
      showForm: true,
    });
  });
  it("desconectado se trata como no conectado con aviso", () => {
    const d = decideConnectionCard("disconnected", null);
    expect(d.label).toBe("Desconectado");
    expect(d.showForm).toBe(true);
  });
});
