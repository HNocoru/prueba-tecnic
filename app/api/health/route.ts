import { NextResponse } from "next/server";

import packageJson from "../../../package.json";

/**
 * Endpoint de salud. No contiene lógica de negocio: solo reporta estado, versión y commit.
 */
export async function GET(): Promise<NextResponse> {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown";

  return NextResponse.json(
    {
      status: "ok",
      version: packageJson.version,
      commit,
    },
    { status: 200 },
  );
}
