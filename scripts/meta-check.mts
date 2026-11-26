// Diagnóstico de la suscripción del webhook en Meta. No imprime secretos, solo URLs y campos.
// Uso: pnpm meta:check            (solo lectura)
//      pnpm meta:check --fix <URL_DEL_WEBHOOK>   (suscribe la app a la WABA con esa URL)
import { createHmac } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v25.0";
const APP_ID = "1577580401075659";
const WABA_ID = "2156913788256649";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const token = required("WHATSAPP_ACCESS_TOKEN");
const secret = required("WHATSAPP_APP_SECRET");
const proof = createHmac("sha256", secret).update(token).digest("hex");

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${path}${sep}appsecret_proof=${proof}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: number } }).error;
    return { http: res.status, error: err?.message ?? "error", code: err?.code };
  }
  return body;
}

const args = process.argv.slice(2);
const fixIdx = args.indexOf("--fix");

if (fixIdx >= 0) {
  const url = args[fixIdx + 1];
  if (!url?.startsWith("https://"))
    throw new Error("Uso: --fix https://tu-dominio/api/whatsapp/webhook");
  const out = await call(`/${WABA_ID}/subscribed_apps`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      override_callback_uri: url,
      verify_token: required("WHATSAPP_VERIFY_TOKEN"),
    }),
  });
  console.log("subscribe:", JSON.stringify(out));
}

console.log("WABA subscribed_apps:", JSON.stringify(await call(`/${WABA_ID}/subscribed_apps`)));
const appToken = `${APP_ID}|${secret}`;
const subs = await fetch(
  `${GRAPH}/${APP_ID}/subscriptions?access_token=${encodeURIComponent(appToken)}`,
);
const subsBody = (await subs.json().catch(() => ({}))) as {
  data?: Array<{ object: string; callback_url?: string; fields?: Array<{ name: string }> }>;
  error?: { message?: string };
};
console.log(
  "App subscriptions:",
  JSON.stringify(
    subsBody.error
      ? { error: subsBody.error.message }
      : (subsBody.data ?? []).map((s) => ({
          object: s.object,
          callback_url: s.callback_url,
          fields: s.fields?.map((f) => f.name),
        })),
  ),
);

// Configuración de llamadas del número (solo lectura). Con --calling-enable la activa.
const PHONE_ID = "1370925136115469";
if (args.includes("--calling-enable")) {
  const out = await call(`/${PHONE_ID}/settings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ calling: { status: "ENABLED" } }),
  });
  console.log("calling enable:", JSON.stringify(out));
}
console.log(
  "Calling settings:",
  JSON.stringify(await call(`/${PHONE_ID}/settings?fields=calling`)),
);
