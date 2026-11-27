import { describe, expect, it } from "vitest";

import { RegisterAccount } from "../application/RegisterAccount";
import { SupabaseAccountProvisioner } from "./supabase-account-provisioner";

const VALID = { businessName: "Café Aurora", email: "dueno@proton.me", password: "Segura123!abc" };

function fakeClient(createUserError?: unknown) {
  const calls: unknown[][] = [];
  const client = {
    auth: {
      admin: {
        createUser: async (payload: unknown) => {
          calls.push(["createUser", payload]);
          if (createUserError) {
            return { data: null, error: createUserError };
          }
          return { data: { user: { id: "user-1" } }, error: null };
        },
        deleteUser: async (id: string) => {
          calls.push(["deleteUser", id]);
          return { error: null };
        },
      },
    },
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push([`${table}.insert`, payload]);
          if (table === "tenants") {
            return {
              select: () => ({ single: async () => ({ data: { id: "tenant-1" }, error: null }) }),
            };
          }
          return Promise.resolve({ error: null });
        },
        delete() {
          calls.push([`${table}.delete`]);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };
  return { client: client as never, calls };
}

describe("SupabaseAccountProvisioner", () => {
  it("confirma el correo sin pedir verificación al crear el usuario", async () => {
    const { client, calls } = fakeClient();
    await new SupabaseAccountProvisioner(client).createUser({
      email: VALID.email,
      password: VALID.password,
    });

    expect(calls[0]).toEqual([
      "createUser",
      { email: VALID.email, password: VALID.password, email_confirm: true },
    ]);
  });

  it("nunca envía un tenant_id desde el cliente al crear el negocio", async () => {
    const { client, calls } = fakeClient();
    await new SupabaseAccountProvisioner(client).createTenant({
      name: VALID.businessName,
      slug: "cafe-aurora-abcd1234",
    });

    expect(calls[0]).toEqual([
      "tenants.insert",
      { name: VALID.businessName, slug: "cafe-aurora-abcd1234" },
    ]);
  });

  it("no confunde un correo no aprobado con un correo duplicado", async () => {
    const { client } = fakeClient({
      code: "email_address_not_approved",
      message: "Email address not approved",
    });

    const result = await new RegisterAccount(new SupabaseAccountProvisioner(client)).execute(VALID);

    expect(result).toEqual({
      ok: false,
      fieldErrors: {},
      error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    });
  });
});
