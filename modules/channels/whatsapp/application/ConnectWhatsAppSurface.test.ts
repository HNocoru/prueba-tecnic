import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../../", import.meta.url));

function source(path: string): string {
  return readFileSync(new URL(path, `file://${root}`), "utf8");
}

describe("Superficie de conexión de WhatsApp", () => {
  it("la tarjeta y la acción no piden ni mencionan el id técnico", () => {
    const card = source("components/organisms/ConnectWhatsAppCard.tsx");
    const action = source("app/(web)/(dashboard)/home/actions.ts");

    expect(card).not.toContain("phone_number_id");
    expect(card).not.toContain("phoneNumberId");
    expect(action).not.toContain("phone_number_id");
    expect(action).not.toContain("phoneNumberId");
  });

  it("los mensajes de error hablan de número, no de ID", () => {
    const useCase = source("modules/channels/whatsapp/application/ConnectWhatsAppNumber.ts");

    expect(useCase).not.toContain("ID de número");
    expect(useCase).toContain("Ese número ya está conectado a otro negocio.");
  });
});
