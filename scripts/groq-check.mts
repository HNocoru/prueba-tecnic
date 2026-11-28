// Diagnóstico de Groq: ¿hay llave y modelo?, ¿responde?, ¿cuánto tarda? No imprime la llave.
// Uso: pnpm groq:check   (lee la configuración de entorno por sí solo)
const key = process.env.GROQ_API_KEY;
const model = process.env.LLM_MODEL;
console.log(`GROQ_API_KEY: ${key ? "presente" : "VACÍA"}`);
console.log(`LLM_MODEL: ${model ? model : "VACÍO"}`);
if (!key || !model) {
  console.log("Falta configuración; sin eso la app no puede contestar por texto.");
  process.exit(1);
}

async function probe(label: string, url: string, init: RequestInit): Promise<void> {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(40_000) });
    const text = await res.text();
    let detail = "";
    if (!res.ok) {
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
        detail = ` | ${parsed.error?.code ?? ""} ${parsed.error?.message ?? ""}`.trimEnd();
      } catch {
        detail = " | respuesta no es JSON";
      }
    } else if (label === "chat") {
      const parsed = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
      detail = ` | respuesta: "${(parsed.choices?.[0]?.message?.content ?? "").slice(0, 60)}"`;
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${label}: HTTP ${res.status} en ${seconds} s${detail}`);
  } catch (error) {
    const name = error instanceof Error ? error.name : "desconocido";
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${label}: FALLÓ (${name}) en ${seconds} s`);
  }
}

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
await probe("models", "https://api.groq.com/openai/v1/models", { headers });
await probe("chat", "https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers,
  body: JSON.stringify({
    model,
    max_tokens: 50,
    reasoning_effort: "none",
    reasoning_format: "hidden",
    messages: [{ role: "user", content: "Di hola en una palabra" }],
  }),
});
