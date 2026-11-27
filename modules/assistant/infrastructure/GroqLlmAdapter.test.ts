import { describe, expect, it } from "vitest";

import { GroqLlmAdapter } from "./GroqLlmAdapter";

const ok = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("GroqLlmAdapter", () => {
  it("envía system + historial al endpoint compatible con OpenAI y devuelve el texto", async () => {
    let url = "";
    let init: RequestInit = {};
    const adapter = new GroqLlmAdapter({
      apiKey: "dummy-key",
      model: "modelo-de-prueba",
      fetchImpl: async (u: string, i: RequestInit) => {
        url = u;
        init = i;
        return ok("listo");
      },
    });
    await expect(
      adapter.generate("system", [
        { role: "user", body: "¿horario?" },
        { role: "assistant", body: "9 a 18" },
      ]),
    ).resolves.toBe("listo");
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer dummy-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("modelo-de-prueba");
    expect(body.max_tokens).toBeLessThanOrEqual(400);
    expect(body.messages).toEqual([
      { role: "system", content: "system" },
      { role: "user", content: "¿horario?" },
      { role: "assistant", content: "9 a 18" },
    ]);
  });

  it("reintenta una sola vez ante 429/5xx y luego falla sin filtrar la key", async () => {
    let calls = 0;
    const adapter = new GroqLlmAdapter({
      apiKey: "SECRETO-GROQ",
      model: "m",
      fetchImpl: async () => {
        calls += 1;
        return new Response("rate limited SECRETO-GROQ", { status: 429 });
      },
    });
    const error = await adapter.generate("s", [{ role: "user", body: "hola" }]).catch((e) => e);
    expect(calls).toBe(2);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("SECRETO-GROQ");
  });

  it("falla claro si falta la key o el modelo", async () => {
    const noKey = new GroqLlmAdapter({ apiKey: undefined, model: "m" });
    await expect(noKey.generate("s", [])).rejects.toThrow("GROQ_API_KEY");
    const noModel = new GroqLlmAdapter({ apiKey: "k", model: undefined });
    await expect(noModel.generate("s", [])).rejects.toThrow("LLM_MODEL");
  });
});
