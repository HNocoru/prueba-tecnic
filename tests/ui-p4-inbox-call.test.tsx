import { describe, expect, it } from "vitest";

import {
  CALL_WINDOW_BACK_TO_CONVERSATION,
  CALL_WINDOW_BACK_TO_SUMMARY,
  CALL_WINDOW_CLOSE,
  CALL_WINDOW_TITLE_SUMMARY,
  CALL_WINDOW_TITLE_TRANSCRIPT,
  CALL_WINDOW_VIEW_TRANSCRIPT,
  INBOX_AI_FOOTER,
} from "@/components/organisms/inbox-copy";

describe("S16 · bandeja Parte 4", () => {
  it("define el pie informativo sin composer", () => {
    expect(INBOX_AI_FOOTER).toBe("La IA responde automáticamente");
  });

  it("define las acciones de la ventana de llamada en español", () => {
    expect(CALL_WINDOW_BACK_TO_SUMMARY).toBe("Volver al resumen");
    expect(CALL_WINDOW_VIEW_TRANSCRIPT).toBe("Ver transcripción");
    expect(CALL_WINDOW_BACK_TO_CONVERSATION).toBe("Volver a la conversación");
    expect(CALL_WINDOW_CLOSE).toBe("Cerrar");
  });

  it("define los nombres accesibles del resumen y la transcripción", () => {
    expect(CALL_WINDOW_TITLE_SUMMARY).toBe("Detalle de la llamada");
    expect(CALL_WINDOW_TITLE_TRANSCRIPT).toBe("Transcripción de la llamada");
  });
});
