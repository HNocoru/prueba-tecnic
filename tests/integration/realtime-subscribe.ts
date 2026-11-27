import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Suscribe a un canal de Realtime con reintentos. Tras reiniciar Realtime (p. ej. con `db reset`)
 * las primeras suscripciones pueden expirar aunque el aislamiento sea correcto; reintentar evita
 * falsos negativos sin ocultar un fallo real (si todos los intentos fallan, se lanza el error).
 */
export async function subscribeWithRetry(
  client: SupabaseClient,
  makeChannel: () => RealtimeChannel,
  attempts = 4,
  delayMs = 2500,
): Promise<RealtimeChannel> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const channel = makeChannel();
    try {
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            reject(new Error(status));
          }
        });
      });
      return channel;
    } catch (error) {
      lastError = error;
      await client.removeChannel(channel);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Realtime: no se pudo suscribir");
}
