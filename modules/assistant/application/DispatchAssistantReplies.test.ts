import { describe, expect, it } from "vitest";

import { dispatchAssistantReplies, type InboundTrigger } from "./DispatchAssistantReplies";

const triggers: InboundTrigger[] = [
  { tenantId: "t1", conversationId: "c1", messageId: "wamid.1", kind: "text" },
  { tenantId: "t2", conversationId: "c2", messageId: "wamid.2", kind: "audio" },
];

describe("dispatchAssistantReplies", () => {
  it("despacha cada mensaje nuevo con su tenant y conversación", async () => {
    const executed: string[] = [];
    await dispatchAssistantReplies(
      () =>
        ({
          execute: async (tenantId: string, conversationId: string, messageId: string) => {
            executed.push(`${tenantId}:${conversationId}:${messageId}`);
          },
        }) as never,
      triggers,
    );
    expect(executed).toEqual(["t1:c1:wamid.1", "t2:c2:wamid.2"]);
  });

  it("nunca propaga errores al webhook", async () => {
    await expect(
      dispatchAssistantReplies(
        () =>
          ({
            execute: async () => {
              throw new Error("fallo interno del asistente");
            },
          }) as never,
        triggers,
      ),
    ).resolves.toBeUndefined();
  });
});
