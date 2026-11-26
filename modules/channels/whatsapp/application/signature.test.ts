import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyHandshake, verifySignature } from "./signature";

const SECRET = "app-secret";
const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifySignature", () => {
  const body = JSON.stringify({ a: 1 });

  it("acepta una firma válida", () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });
  it("rechaza una firma hecha con otro secreto", () => {
    expect(verifySignature(body, sign(body, "otro"), SECRET)).toBe(false);
  });
  it("rechaza si el cuerpo cambió", () => {
    expect(verifySignature(body + " ", sign(body), SECRET)).toBe(false);
  });
  it("rechaza firma ausente o vacía", () => {
    expect(verifySignature(body, null, SECRET)).toBe(false);
    expect(verifySignature(body, "", SECRET)).toBe(false);
  });
  it("rechaza longitud distinta o formato sin prefijo sin lanzar", () => {
    expect(verifySignature(body, "sha256=abc", SECRET)).toBe(false);
    expect(verifySignature(body, sign(body).slice(7), SECRET)).toBe(false);
  });
});

describe("verifyHandshake", () => {
  const params = (o: Record<string, string>) => new URLSearchParams(o);

  it("devuelve el challenge con modo y token correctos", () => {
    expect(
      verifyHandshake(
        params({ "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "1234" }),
        "tok",
      ),
    ).toBe("1234");
  });
  it("devuelve null con token malo, modo malo o sin challenge", () => {
    expect(
      verifyHandshake(
        params({ "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "1" }),
        "tok",
      ),
    ).toBeNull();
    expect(
      verifyHandshake(
        params({ "hub.mode": "other", "hub.verify_token": "tok", "hub.challenge": "1" }),
        "tok",
      ),
    ).toBeNull();
    expect(
      verifyHandshake(params({ "hub.mode": "subscribe", "hub.verify_token": "tok" }), "tok"),
    ).toBeNull();
  });
});
