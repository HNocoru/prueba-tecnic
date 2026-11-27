import { describe, expect, it, vi } from "vitest";

import { GroqSummaryLlmAdapter } from "./GroqSummaryLlmAdapter";

function response(status: number, content: unknown): Response {
  return new Response(JSON.stringify(content), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function groqResponse(content: string): Response {
  return response(200, { choices: [{ message: { content } }] });
}

describe("GroqSummaryLlmAdapter", () => {
  it("envía el resumen como contenido de usuario con opciones de razonamiento acotadas", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(groqResponse('{"summary":"ok","facts":{}}'));
    const llm = new GroqSummaryLlmAdapter({
      apiKey: "test-key",
      model: "qwen/qwen3.8-27b",
      fetchImpl,
    });
    await llm.generateSummary("instrucciones fijas", "Usuario: hola");
    const [, init] = fetchImpl.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([
      { role: "system", content: "instrucciones fijas" },
      { role: "user", content: "Usuario: hola" },
    ]);
    expect(body.reasoning_effort).toBe("none");
    expect(body.reasoning_format).toBe("hidden");
    expect(body.model).toBe("qwen/qwen3.8-27b");
  });

  it("quita defensivamente <think> aunque el proveedor lo devuelva", async () => {
    const llm = new GroqSummaryLlmAdapter({
      apiKey: "test-key",
      model: "qwen/qwen3.8-27b",
      fetchImpl: vi
        .fn()
        .mockResolvedValue(groqResponse('<think>privado</think>\n{"summary":"ok"}')),
    });
    await expect(llm.generateSummary("sistema", "transcripción")).resolves.toBe('{"summary":"ok"}');
  });

  it("reintenta una vez ante 429 y no propaga cuerpos", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(429, { error: "secreto" }))
      .mockResolvedValueOnce(groqResponse('{"summary":"ok"}'));
    const llm = new GroqSummaryLlmAdapter({
      apiKey: "test-key",
      model: "qwen/qwen3.8-27b",
      fetchImpl,
    });
    await expect(llm.generateSummary("sistema", "transcripción")).resolves.toBe('{"summary":"ok"}');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rechaza respuestas vacías tras quitar el razonamiento", async () => {
    const llm = new GroqSummaryLlmAdapter({
      apiKey: "test-key",
      model: "qwen/qwen3.8-27b",
      fetchImpl: vi.fn().mockResolvedValue(groqResponse("<think>nada</think>")),
    });
    await expect(llm.generateSummary("sistema", "transcripción")).rejects.toThrow(
      "Groq devolvió una respuesta vacía",
    );
  });

  it("falla sin key ni modelo sin imprimir valores", async () => {
    const llm = new GroqSummaryLlmAdapter({ apiKey: undefined, model: undefined });
    await expect(llm.generateSummary("sistema", "transcripción")).rejects.toThrow(
      "GROQ_API_KEY no configurado",
    );
  });
});
