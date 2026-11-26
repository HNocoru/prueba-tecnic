import { z } from "zod";

import type { WorkerHeartbeat } from "./ports";

const heartbeatSchema = z.object({
  worker_id: z.string().min(1),
  active_calls: z.number().int().nonnegative(),
  version: z.string().min(1),
});

export type HeartbeatResult =
  { ok: true; heartbeat: WorkerHeartbeat } | { ok: false; error: "invalid" };

/**
 * Caso de uso: valida el latido del worker. Deuda: no hay tabla de heartbeats todavía,
 * así que la entrada del endpoint solo lo registra en el log.
 */
export class RecordWorkerHeartbeat {
  execute(input: unknown): HeartbeatResult {
    const parsed = heartbeatSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    return {
      ok: true,
      heartbeat: {
        workerId: parsed.data.worker_id,
        activeCalls: parsed.data.active_calls,
        version: parsed.data.version,
      },
    };
  }
}
