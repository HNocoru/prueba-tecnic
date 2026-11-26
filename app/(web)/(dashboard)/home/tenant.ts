import "server-only";

import { createClient } from "@/shared/supabase/server";

/** Tenant del usuario autenticado: sale de tenant_members en el servidor, nunca del cliente. */
export async function resolveTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();
  return data?.tenant_id ?? null;
}
