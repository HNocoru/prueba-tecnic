import { verifyWorkerAuthorization } from "@/modules/calls";
import { composeCallApi } from "@/modules/calls/composition";
import { serverEnv } from "@/shared/env.server";

/** Cierre de la llamada; repetirlo responde 200 con los mismos valores. */
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

  const result = await composeCallApi().endCall.execute(callId, body);
  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.error === "invalid" ? 400 : 404 },
    );
  }
  return Response.json({ ok: true }, { status: 200 });
}
