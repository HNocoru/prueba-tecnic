const PROVIDER_ERROR_MAX = 500;

/** Quita credenciales de mensajes de error antes de persistirlos en webhook_events. */
export function redactError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/(bearer\s+)\S+/gi, "$1[REDACTED]")
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED]")
    .slice(0, PROVIDER_ERROR_MAX);
}
