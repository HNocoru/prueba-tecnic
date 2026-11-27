import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/db";

import { DuplicateEmailError } from "../application/errors";
import type {
  AccountProvisioner,
  CreateAccountUserData,
  CreateTenantData,
} from "../application/ports";

type ProviderError = { code?: unknown; message?: unknown };

/**
 * GoTrue no expone un código estable documentado para correo repetido: se
 * reconoce por código o mensaje y nunca se propaga el texto del proveedor.
 */
function isDuplicateEmail(error: ProviderError): boolean {
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return code === "email_exists" || /already (registered|exists|in use)/.test(message);
}

/** Aprovisiona cuenta, negocio y membresía con service_role, solo en servidor. */
export class SupabaseAccountProvisioner implements AccountProvisioner {
  constructor(private readonly injectedClient?: SupabaseClient<Database>) {}

  /** El cliente de producción se resuelve tarde para no validar env en los tests. */
  private async client(): Promise<SupabaseClient<Database>> {
    if (this.injectedClient) {
      return this.injectedClient;
    }
    const { createAdminClient } = await import("@/shared/supabase/admin");
    return createAdminClient();
  }

  async createUser({ email, password }: CreateAccountUserData): Promise<string> {
    const { data, error } = await (
      await this.client()
    ).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (isDuplicateEmail(error)) {
        throw new DuplicateEmailError();
      }
      throw new Error("No se pudo crear el usuario.");
    }
    if (!data.user) {
      throw new Error("No se pudo crear el usuario.");
    }

    return data.user.id;
  }

  async createTenant({ name, slug }: CreateTenantData): Promise<string> {
    const { data, error } = await (
      await this.client()
    )
      .from("tenants")
      .insert({ name, slug })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("No se pudo crear el negocio.");
    }

    return data.id;
  }

  async addMember(tenantId: string, userId: string): Promise<void> {
    // El esquema no define un rol "owner": se respeta el default "operator".
    const { error } = await (
      await this.client()
    )
      .from("tenant_members")
      .insert({ tenant_id: tenantId, user_id: userId });

    if (error) {
      throw new Error("No se pudo crear la membresía.");
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const { error } = await (await this.client()).from("tenants").delete().eq("id", tenantId);

    if (error) {
      throw new Error("No se pudo deshacer el negocio.");
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await (await this.client()).auth.admin.deleteUser(userId);

    if (error) {
      throw new Error("No se pudo deshacer el usuario.");
    }
  }
}
