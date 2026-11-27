import "server-only";

import { RegisterAccount } from "./application/RegisterAccount";
import { SupabaseAccountProvisioner } from "./infrastructure/supabase-account-provisioner";

/** Único punto de ensamblado del caso de uso de registro fuera de los tests. */
export function createRegisterAccount(): RegisterAccount {
  return new RegisterAccount(new SupabaseAccountProvisioner());
}
