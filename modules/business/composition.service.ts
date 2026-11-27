import { createAdminClient } from "@/shared/supabase/admin";

import { GetBusinessContext } from "./application/GetBusinessContext";
import { SupabaseBusinessRepository } from "./infrastructure/SupabaseBusinessRepository";

/**
 * Contexto del negocio para procesos sin sesión de usuario (webhook del asistente, worker).
 * Usa service_role: el tenant_id SIEMPRE viene explícito del llamador; nunca de la entrada del cliente.
 */
export function composeBusinessContextForService(): GetBusinessContext {
  return new GetBusinessContext(new SupabaseBusinessRepository(createAdminClient()));
}
