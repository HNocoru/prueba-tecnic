import { verifyWorkerAuthorization } from "@/modules/calls";
import { composeCallApi } from "@/modules/calls/composition";
import { serverEnv } from "@/shared/env.server";
import { logger } from "@/shared/logger";

/** Latido del worker cada 30 s. Deuda: no hay tabla de salud todavía, solo log. */
export async function POST(request: Request): Promise<Response> {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), serverEnv.WORKER_API_TOKEN)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = composeCallApi().heartbeat.execute(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  logger.info(
    {
      workerId: result.heartbeat.workerId,
      activeCalls: result.heartbeat.activeCalls,
      version: result.heartbeat.version,
    },
    "worker heartbeat",
  );
  return new Response(null, { status: 204 });
}
