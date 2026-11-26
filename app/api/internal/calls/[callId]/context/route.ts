import { verifyWorkerAuthorization } from "@/modules/calls";
import { composeCallApi } from "@/modules/calls/composition";
import { serverEnv } from "@/shared/env.server";

/** Contexto del asistente antes de abrir la sesión de voz (contrato v0). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
): Promise<Response> {
  if (
    !verifyWorkerAuthorization(request.headers.get("authorization"), serverEnv.WORKER_API_TOKEN)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { callId } = await params;
  const result = await composeCallApi().getContext.execute(callId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.error === "ended" ? 409 : 404 });
  }
  return Response.json(result.context, { status: 200 });
}
