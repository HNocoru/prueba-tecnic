import { stripThink } from "../application/parseSummaryOutput";
import type { SummaryLlmPort } from "../application/ports";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;
const MAX_TOKENS = 600;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Adaptador propio para el resumen: mismo endpoint y estilo que GroqLlmAdapter, con el
 * razonamiento acotado (qwen3.8 puede devolver <think>) y sin propagar cuerpos de error.
 */
export class GroqSummaryLlmAdapter implements SummaryLlmPort {
  constructor(
    private readonly config: {
      apiKey: string | undefined;
      model: string | undefined;
      fetchImpl?: FetchLike;
    },
  ) {}

  async generateSummary(system: string, transcript: string): Promise<string> {
    if (!this.config.apiKey) throw new Error("GROQ_API_KEY no configurado");
    if (!this.config.model) throw new Error("LLM_MODEL no configurado");
    const doFetch: FetchLike = this.config.fetchImpl ?? ((url, init) => fetch(url, init));

    const body = JSON.stringify({
      model: this.config.model,
      max_tokens: MAX_TOKENS,
      reasoning_effort: "none",
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: system },
        { role: "user", content: transcript },
      ],
    });

    let lastStatus = 0;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await doFetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            choices?: { message?: { content?: string | null } }[];
          };
          const text = stripThink(data.choices?.[0]?.message?.content ?? "");
          if (!text) throw new Error("Groq devolvió una respuesta vacía");
          return text;
        }
        lastStatus = response.status;
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) {
        if (error instanceof Error && error.message === "Groq devolvió una respuesta vacía") {
          throw error;
        }
        lastStatus = 0;
      }
    }
    throw new Error(`Groq falló (estado ${lastStatus || "red/timeout"})`);
  }
}
