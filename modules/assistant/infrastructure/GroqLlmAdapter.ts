import { cleanSecret } from "../application/cleanSecret";
import type { LlmPort } from "../application/ports";
import type { ConversationTurn } from "../domain/ConversationTurn";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;
// Tope bajo a propósito: Groq cuenta contra su límite por minuto la salida estimada
// cuando no se manda max_tokens (lección de reference/ai-call-center).
const MAX_TOKENS = 500;
const SHORT_SYSTEM =
  "Responde en español, breve y directo, solo con el texto final para el cliente. Si no sabes, ofrece pasarlo con una persona.";

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
    const apiKey = cleanSecret("GROQ_API_KEY", this.config.apiKey);
    if (!this.config.model) throw new Error("LLM_MODEL no configurado");
    const doFetch: FetchLike = this.config.fetchImpl ?? ((u, i) => fetch(u, i));

    // Sin los parámetros de razonamiento Qwen gasta todos los tokens en <think> y no queda texto
    // (S24). Un modelo que no los soporta responde 400: en ese caso se reintenta sin ellos.
    const buildBody = (systemPrompt: string, withReasoning = true) =>
      JSON.stringify({
        model: this.config.model,
        max_tokens: MAX_TOKENS,
        ...(withReasoning ? { reasoning_effort: "none", reasoning_format: "hidden" } : {}),
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((turn) => ({ role: turn.role, content: turn.body })),
        ],
      });

    let first: string;
    try {
      first = await this.request(doFetch, apiKey, buildBody(system));
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("estado 400")) throw error;
      first = await this.request(doFetch, apiKey, buildBody(system, false));
    }
    if (first.trim()) return first;
    // Un único reintento con una instrucción más corta antes de rendirse.
    const second = await this.request(doFetch, apiKey, buildBody(SHORT_SYSTEM));
    if (second.trim()) return second;
    throw new Error("Groq devolvió una respuesta vacía");
  }

  /** Una petición con reintento de red/429/5xx; devuelve el texto ya limpio (puede ser vacío). */
  private async request(doFetch: FetchLike, apiKey: string, body: string): Promise<string> {
    let lastStatus = 0;
    // Nombre del error de red (TimeoutError, TypeError, SyntaxError...): sin mensajes ni cuerpos,
    // que podrían traer la key. Solo para diagnosticar "red/timeout".
    let lastCause = "";
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await doFetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            choices?: { message?: { content?: string | null } }[];
          };
          return stripThinkBlocks(data.choices?.[0]?.message?.content ?? "");
        }
        lastStatus = response.status;
        // Solo 429 y 5xx se reintentan; el cuerpo nunca se propaga (podría traer la key).
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) {
        lastStatus = 0;
        lastCause = describeFailure(error);
      }
    }
    throw new Error(
      `Groq falló (estado ${lastStatus || `red/timeout${lastCause ? `: ${lastCause}` : ""}`})`,
    );
  }
}

const THINK_BLOCK = /<think\b[^>]*>[\s\S]*?<\/think\s*>/gi;

/** Qwen puede emitir razonamiento en <think>; nunca debe llegar al cliente. */
export function stripThinkBlocks(value: string): string {
  return value.replace(THINK_BLOCK, "").trim();
}

/**
 * Describe un fallo de red SIN mensajes ni cuerpos (podrían traer la key): nombre del error,
 * código de la causa (ENOTFOUND, ECONNREFUSED, UND_ERR_...) y la función donde se lanzó.
 */
export function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return "desconocido";
  const parts = [error.name];
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code)) parts.push(code);
  const frame = error.stack?.split("\n")[1]?.match(/at (?:async )?([\w$.<>]+)/)?.[1];
  if (frame) parts.push(`en ${frame}`);
  return parts.join(" ");
}
