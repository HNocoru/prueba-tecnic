import { describe, expect, it, vi } from "vitest";

import { RegisterAccount } from "./RegisterAccount";
import { DuplicateEmailError } from "./errors";
import type { AccountProvisioner } from "./ports";

describe("RegisterAccount", () => {
  it("creates the user, the tenant and the membership without taking a tenant id from the input", async () => {
    const createUser = vi.fn().mockResolvedValue("user-1");
    const createTenant = vi.fn().mockResolvedValue("tenant-1");
    const addMember = vi.fn().mockResolvedValue(undefined);
    const deleteTenant = vi.fn().mockResolvedValue(undefined);
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant,
      addMember,
      deleteTenant,
      deleteUser,
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "Café Aurora",
      email: " dueno@cafe.mx ",
      password: "Segura123!abc",
    });

    expect(result).toEqual({ ok: true, userId: "user-1", tenantId: "tenant-1" });
    expect(createUser).toHaveBeenCalledWith({
      email: "dueno@cafe.mx",
      password: "Segura123!abc",
    });
    expect(createTenant).toHaveBeenCalledWith({
      name: "Café Aurora",
      slug: expect.stringMatching(/^cafe-aurora-[a-z0-9]+$/),
    });
    expect(addMember).toHaveBeenCalledWith("tenant-1", "user-1");
    expect(deleteTenant).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("reports the exact Spanish message when the email is already registered", async () => {
    const createUser = vi.fn().mockRejectedValue(new DuplicateEmailError());
    const createTenant = vi.fn();
    const addMember = vi.fn();
    const deleteTenant = vi.fn();
    const deleteUser = vi.fn();
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant,
      addMember,
      deleteTenant,
      deleteUser,
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "Café Aurora",
      email: "dueno@cafe.mx",
      password: "Segura123!abc",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {},
      error: "Ya existe una cuenta con ese correo.",
    });
    expect(createTenant).not.toHaveBeenCalled();
    expect(addMember).not.toHaveBeenCalled();
  });

  it("rolls back the tenant and the user when the membership insert fails", async () => {
    const createUser = vi.fn().mockResolvedValue("user-1");
    const createTenant = vi.fn().mockResolvedValue("tenant-1");
    const addMember = vi.fn().mockRejectedValue(new Error("membership insert failed"));
    const deleteTenant = vi.fn().mockResolvedValue(undefined);
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant,
      addMember,
      deleteTenant,
      deleteUser,
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "Café Aurora",
      email: "dueno@cafe.mx",
      password: "Segura123!abc",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {},
      error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    });
    expect(deleteTenant).toHaveBeenCalledWith("tenant-1");
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("rejects a weak password with the existing strength rule before touching Supabase", async () => {
    const createUser = vi.fn();
    const createTenant = vi.fn();
    const addMember = vi.fn();
    const deleteTenant = vi.fn();
    const deleteUser = vi.fn();
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant,
      addMember,
      deleteTenant,
      deleteUser,
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "Café Aurora",
      email: "dueno@cafe.mx",
      password: "corta",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { password: "La contraseña debe tener al menos 12 caracteres" },
      error: null,
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(createTenant).not.toHaveBeenCalled();
  });

  it("rejects an empty business name before touching Supabase", async () => {
    const createUser = vi.fn();
    const createTenant = vi.fn();
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant,
      addMember: vi.fn(),
      deleteTenant: vi.fn(),
      deleteUser: vi.fn(),
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "   ",
      email: "dueno@cafe.mx",
      password: "Segura123!abc",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { businessName: "El nombre del negocio es requerido" },
      error: null,
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(createTenant).not.toHaveBeenCalled();
  });

  it("rejects a malformed email with the existing email rule", async () => {
    const createUser = vi.fn();
    const provisioner: AccountProvisioner = {
      createUser,
      createTenant: vi.fn(),
      addMember: vi.fn(),
      deleteTenant: vi.fn(),
      deleteUser: vi.fn(),
    };

    const result = await new RegisterAccount(provisioner).execute({
      businessName: "Café Aurora",
      email: "no-es-un-correo",
      password: "Segura123!abc",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: "Formato de email inválido" },
      error: null,
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("exposes a rollback seam for a failed sign-in after provisioning", async () => {
    const deleteTenant = vi.fn().mockResolvedValue(undefined);
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const provisioner: AccountProvisioner = {
      createUser: vi.fn().mockResolvedValue("user-1"),
      createTenant: vi.fn().mockResolvedValue("tenant-1"),
      addMember: vi.fn().mockResolvedValue(undefined),
      deleteTenant,
      deleteUser,
    };

    const useCase = new RegisterAccount(provisioner);
    const result = await useCase.execute({
      businessName: "Café Aurora",
      email: "dueno@cafe.mx",
      password: "Segura123!abc",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    await useCase.rollback(result);

    expect(deleteTenant).toHaveBeenCalledWith("tenant-1");
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });
});
