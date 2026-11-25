import { NextResponse } from "next/server";

import { signOut } from "@/lib/supabase/auth";

/**
 * Cierra la sesión actual. Solo POST para evitar cierres de sesión accidentales
 * con enlaces o prefetch del navegador.
 */
export async function POST(request: Request): Promise<NextResponse> {
  await signOut();

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
