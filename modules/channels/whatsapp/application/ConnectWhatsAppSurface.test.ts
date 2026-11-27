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

  it("ningún dato de plataforma llega al componente cliente", () => {
    const card = source("components/organisms/ConnectWhatsAppCard.tsx");
    const model = source("modules/channels/whatsapp/application/GetWhatsAppConnection.ts");
    const view = source("modules/channels/whatsapp/domain/connectionCard.ts");
    const action = source("app/(web)/(dashboard)/home/actions.ts");

    for (const text of [card, model, view, action]) {
      expect(text).not.toMatch(/webhook|verify|token|phone_number_id|\bapi\b/i);
    }
    expect(model).not.toContain("NEXT_PUBLIC_APP_URL");
    expect(card).not.toContain("navigator.clipboard");
    expect(card).not.toContain("Copiar URL");
  });

  it("los mensajes de error hablan de número, no de ID ni de configuración", () => {
    const useCase = source("modules/channels/whatsapp/application/ConnectWhatsAppNumber.ts");

    expect(useCase).not.toContain("ID de número");
    expect(useCase).toContain("Ese número ya está conectado a otro negocio.");
    expect(useCase).toContain(
      "Escribe el número con código de país, por ejemplo +52 55 1234 5678.",
    );
    expect(useCase).toContain(
      "No encontramos ese número como cuenta de WhatsApp Business. Revisa que esté registrado e inténtalo de nuevo.",
    );
    expect(useCase).toContain(
      "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    );
    expect(useCase).not.toContain(
      "Falta configurar la cuenta de WhatsApp Business de la plataforma.",
    );
    expect(useCase).not.toContain("Verifícalo con tu proveedor");
  });
});
