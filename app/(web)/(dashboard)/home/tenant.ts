import "server-only";

import { createClient } from "@/shared/supabase/server";

/**
 * Tenant del usuario autenticado: sale de current_tenant() en el servidor, nunca
 * del cliente. No vuelve a llamar a auth.getUser(): el proxy ya verificó la sesión.
 */
export async function resolveTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_tenant");
  if (error || !data?.length) return null;
  return data[0];
}
