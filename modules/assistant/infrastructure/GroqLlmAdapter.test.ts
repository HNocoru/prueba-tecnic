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
    expect(body.max_tokens).toBe(500);
    expect(body.reasoning_effort).toBe("none");
    expect(body.reasoning_format).toBe("hidden");
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

  it("si el modelo rechaza los parámetros de razonamiento (400), reintenta sin ellos", async () => {
    const bodies: Record<string, unknown>[] = [];
    const adapter = new GroqLlmAdapter({
      apiKey: "dummy-key",
      model: "modelo-sin-razonamiento",
      fetchImpl: async (_u: string, i: RequestInit) => {
        bodies.push(JSON.parse(i.body as string));
        return bodies.length === 1
          ? new Response("reasoning_effort no soportado", { status: 400 })
          : ok("respuesta sin razonamiento");
      },
    });
    await expect(adapter.generate("system", [{ role: "user", body: "hola" }])).resolves.toBe(
      "respuesta sin razonamiento",
    );
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toHaveProperty("reasoning_effort", "none");
    expect(bodies[1]).not.toHaveProperty("reasoning_effort");
    expect(bodies[1]).not.toHaveProperty("reasoning_format");
  });

  it("un 400 que persiste sin los parámetros falla sin filtrar la key", async () => {
    const adapter = new GroqLlmAdapter({
      apiKey: "SECRETO-GROQ",
      model: "m",
      fetchImpl: async () => new Response("mal pedido SECRETO-GROQ", { status: 400 }),
    });
    const error = await adapter.generate("s", [{ role: "user", body: "hola" }]).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("SECRETO-GROQ");
  });

  it("un fallo de red dice el tipo de error sin filtrar mensajes ni la key", async () => {
    const adapter = new GroqLlmAdapter({
      apiKey: "SECRETO-GROQ",
      model: "m",
      fetchImpl: async () => {
        throw new TypeError("fetch failed SECRETO-GROQ");
      },
    });
    const error = await adapter.generate("s", [{ role: "user", body: "hola" }]).catch((e) => e);
    expect((error as Error).message).toContain("red/timeout: TypeError");
    expect((error as Error).message).not.toContain("SECRETO-GROQ");
  });

  it("falla claro si falta la key o el modelo", async () => {
    const noKey = new GroqLlmAdapter({ apiKey: undefined, model: "m" });
    await expect(noKey.generate("s", [])).rejects.toThrow("GROQ_API_KEY");
    const noModel = new GroqLlmAdapter({ apiKey: "k", model: undefined });
    await expect(noModel.generate("s", [])).rejects.toThrow("LLM_MODEL");
  });

  it("quita defensivamente cualquier bloque <think>...</think> del contenido", async () => {
    const adapter = new GroqLlmAdapter({
      apiKey: "k",
      model: "m",
      fetchImpl: async () => ok("<think>razonamiento interno</think>\nRespuesta final"),
    });
    await expect(adapter.generate("s", [])).resolves.toBe("Respuesta final");
  });

  it("reintenta una vez con instrucción corta si queda vacío y devuelve el texto", async () => {
    const bodies: { messages: { role: string; content: string }[] }[] = [];
    const answers = ["<think>uno</think>   ", "Hola, ¿en qué te ayudo?"];
    const adapter = new GroqLlmAdapter({
      apiKey: "k",
      model: "m",
      fetchImpl: async (_u: string, i: RequestInit) => {
        bodies.push(JSON.parse(i.body as string));
        return ok(answers.shift() ?? "");
      },
    });
    await expect(adapter.generate("s", [{ role: "user", body: "hola" }])).resolves.toBe(
      "Hola, ¿en qué te ayudo?",
    );
    expect(bodies).toHaveLength(2);
    expect(bodies[1]?.messages[0]?.content).not.toBe("s");
    expect(bodies[1]?.messages[0]?.content.length).toBeLessThan(200);
  });

  it("si el reintento también queda vacío falla con error de respuesta vacía", async () => {
    let calls = 0;
    const adapter = new GroqLlmAdapter({
      apiKey: "k",
      model: "m",
      fetchImpl: async () => {
        calls += 1;
        return ok("<think>uno</think><think>dos</think>   ");
      },
    });
    await expect(adapter.generate("s", [])).rejects.toThrow("vacía");
    expect(calls).toBe(2);
  });
});
