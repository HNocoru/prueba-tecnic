import { verifyWorkerAuthorization } from "@/modules/calls";
import { composeCallApi } from "@/modules/calls/composition";
import { serverEnv } from "@/shared/env.server";

/** Turnos de transcripción incrementales, idempotentes por (call_id, seq). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
): Promise<Response> {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), serverEnv.WORKER_API_TOKEN)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { callId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = await composeCallApi().recordTurns.execute(callId, body);
  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.error === "invalid" ? 400 : 404 },
    );
  }
  return new Response(null, { status: 204 });
}
