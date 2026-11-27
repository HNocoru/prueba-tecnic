import { beforeEach, describe, expect, it, vi } from "vitest";

const order = vi.hoisted(() => [] as string[]);

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    order.push("connection");
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [{ name: "sb-auth-token", value: "session" }],
    set: () => undefined,
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => {
    order.push("createServerClient");
    return {} as never;
  }),
}));

vi.mock("@/shared/env.client", () => ({
  clientEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));

import { createClient } from "./server";

describe("createClient (servidor)", () => {
  beforeEach(() => {
    order.length = 0;
  });

  it("defiere la creación del cliente con sesión hasta la petición", async () => {
    await createClient();

    // createServerClient registra onAuthStateChange, que lee expires_at con
    // Date.now() al cargar la sesión de cookies. Debe ocurrir después de connection().
    expect(order).toEqual(["connection", "createServerClient"]);
  });
});
