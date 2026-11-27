import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import { RegisterAccount } from "@/modules/auth/application/RegisterAccount";
import type { AccountProvisioner } from "@/modules/auth/application/ports";
import { SupabaseAccountProvisioner } from "@/modules/auth/infrastructure/supabase-account-provisioner";

// Igual que el resto de integraciones: CLI local y llaves demo públicas de la CLI.
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = randomBytes(4).toString("hex");
const password = `Segura123!${randomBytes(6).toString("base64url")}`;
const email = `signup-${suffix}@example.test`;
const foreignTenantId = randomUUID();
const foreignContactId = randomUUID();

const createdUserIds: string[] = [];
const createdTenantIds: string[] = [];

const provisioner = new SupabaseAccountProvisioner(admin);
const registerAccount = new RegisterAccount(provisioner);

async function cleanup(): Promise<void> {
  if (createdTenantIds.length) {
    await admin.from("tenant_members").delete().in("tenant_id", createdTenantIds);
    await admin.from("tenants").delete().in("id", createdTenantIds);
  }
  await admin.from("contacts").delete().eq("id", foreignContactId);
  await admin.from("tenant_members").delete().eq("tenant_id", foreignTenantId);
  await admin.from("tenants").delete().eq("id", foreignTenantId);
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

afterAll(cleanup);

describe("registro contra Supabase local", () => {
  it("crea usuario confirmado, negocio y membresía con el rol por defecto", async () => {
    const result = await registerAccount.execute({
      businessName: `Negocio ${suffix}`,
      email,
      password,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    createdUserIds.push(result.userId);
    createdTenantIds.push(result.tenantId);

    const user = await admin.auth.admin.getUserById(result.userId);
    expect(user.error).toBeNull();
    expect(user.data.user?.email).toBe(email);
    expect(user.data.user?.email_confirmed_at).not.toBeNull();

    const tenant = await admin
      .from("tenants")
      .select("id, name, slug, status")
      .eq("id", result.tenantId)
      .single();
    expect(tenant.error).toBeNull();
    expect(tenant.data?.name).toBe(`Negocio ${suffix}`);
    expect(tenant.data?.slug).toMatch(/^negocio-[a-z0-9]+-[a-z0-9]+$/);
    expect(tenant.data?.status).toBe("active");

    const member = await admin
      .from("tenant_members")
      .select("tenant_id, user_id, role")
      .eq("tenant_id", result.tenantId)
      .eq("user_id", result.userId)
      .single();
    expect(member.error).toBeNull();
    expect(member.data?.role).toBe("operator");
  });

  it("el usuario nuevo no ve datos del tenant ajeno", async () => {
    const owner = await registerAccount.execute({
      businessName: `Dueño ${suffix}`,
      email: `owner-${suffix}@example.test`,
      password,
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) {
      return;
    }
    createdUserIds.push(owner.userId);
    createdTenantIds.push(owner.tenantId);

    const foreignTenant = await admin
      .from("tenants")
      .insert({
        id: foreignTenantId,
        slug: `ajeno-${suffix}`,
        name: "Tenant ajeno",
      })
      .select("id")
      .single();
    expect(foreignTenant.error).toBeNull();
    const foreignContact = await admin
      .from("contacts")
      .insert({
        id: foreignContactId,
        tenant_id: foreignTenantId,
        wa_id: `wa-${suffix}`,
        name: "Contacto ajeno",
      })
      .select("id")
      .single();
    expect(foreignContact.error).toBeNull();

    const signedIn: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await signedIn.auth.signInWithPassword({
      email: `owner-${suffix}@example.test`,
      password,
    });
    expect(login.error).toBeNull();

    const visible = await signedIn.from("contacts").select("id");
    expect(visible.error).toBeNull();
    expect(visible.data?.map((row) => row.id)).not.toContain(foreignContactId);
  });

  it("deshace usuario y tenant reales si falla la membresía", async () => {
    const rollbackEmail = `rollback-${suffix}@example.test`;
    let createdUserId = "";
    let createdTenantId = "";

    const failingProvisioner: AccountProvisioner = {
      createUser: async (data) => {
        const id = await provisioner.createUser(data);
        createdUserId = id;
        return id;
      },
      createTenant: async (data) => {
        const id = await provisioner.createTenant(data);
        createdTenantId = id;
        return id;
      },
      addMember: async () => {
        throw new Error("fallo forzado de membresía");
      },
      deleteTenant: (id) => provisioner.deleteTenant(id),
      deleteUser: (id) => provisioner.deleteUser(id),
    };

    const result = await new RegisterAccount(failingProvisioner).execute({
      businessName: `Rollback ${suffix}`,
      email: rollbackEmail,
      password,
    });

    expect(result.ok).toBe(false);
    expect(createdUserId).not.toBe("");
    expect(createdTenantId).not.toBe("");

    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    expect(users.data.users.some((user) => user.id === createdUserId)).toBe(false);
    const tenant = await admin.from("tenants").select("id").eq("id", createdTenantId).maybeSingle();
    expect(tenant.data).toBeNull();
    const member = await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", createdTenantId);
    expect(member.data).toEqual([]);
  });
});
