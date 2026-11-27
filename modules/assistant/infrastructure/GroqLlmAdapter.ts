import type { LlmPort } from "../application/ports";
import type { ConversationTurn } from "../domain/ConversationTurn";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;
// Tope bajo a propósito: Groq cuenta contra su límite por minuto la salida estimada
// cuando no se manda max_tokens (lección de reference/ai-call-center).
const MAX_TOKENS = 300;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Adaptador de Groq (API compatible con OpenAI, sin SDK). Key y modelo llegan por configuración. */
export class GroqLlmAdapter implements LlmPort {
  constructor(
    private readonly config: {
      apiKey: string | undefined;
      model: string | undefined;
      fetchImpl?: FetchLike;
    },
  ) {}

  async generate(system: string, history: ConversationTurn[]): Promise<string> {
    if (!this.config.apiKey) throw new Error("GROQ_API_KEY no configurado");
    if (!this.config.model) throw new Error("LLM_MODEL no configurado");
    const doFetch: FetchLike = this.config.fetchImpl ?? ((u, i) => fetch(u, i));

    const body = JSON.stringify({
      model: this.config.model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: system },
        ...history.map((turn) => ({ role: turn.role, content: turn.body })),
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
          const text = stripThinkBlocks(data.choices?.[0]?.message?.content ?? "");
          if (!text.trim()) throw new Error("Groq devolvió una respuesta vacía");
          return text;
        }
        lastStatus = response.status;
        // Solo 429 y 5xx se reintentan; el cuerpo nunca se propaga (podría traer la key).
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) {
        if (error instanceof Error && error.message.includes("vacía")) throw error;
        lastStatus = 0;
      }
    }
    throw new Error(`Groq falló (estado ${lastStatus || "red/timeout"})`);
  }
}

const THINK_BLOCK = /<think\b[^>]*>[\s\S]*?<\/think\s*>/gi;

/** Qwen puede emitir razonamiento en <think>; nunca debe llegar al cliente. */
export function stripThinkBlocks(value: string): string {
  return value.replace(THINK_BLOCK, "").trim();
}
