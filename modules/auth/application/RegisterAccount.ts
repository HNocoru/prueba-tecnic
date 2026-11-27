import { z } from "zod";

import { emailSchema, strongPasswordSchema } from "./credentials";
import { DuplicateEmailError } from "./errors";
import type { AccountProvisioner } from "./ports";

/** Regla de negocio: el alta exige negocio, correo válido y contraseña fuerte. */
export const registerAccountSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "El nombre del negocio es requerido")
    .max(120, "El nombre del negocio es demasiado largo"),
  email: emailSchema,
  password: strongPasswordSchema,
});

export type RegisterAccountInput = z.infer<typeof registerAccountSchema>;
export type RegisterAccountFieldErrors = Partial<
  Record<"businessName" | "email" | "password", string>
>;

export type ProvisionedAccount = { userId: string; tenantId: string };

export type RegisterAccountResult =
  | ({ ok: true } & ProvisionedAccount)
  | { ok: false; fieldErrors: RegisterAccountFieldErrors; error: string | null };

const GENERIC_ERROR = "No se pudo crear la cuenta. Inténtalo de nuevo.";
const DUPLICATE_EMAIL_ERROR = "Ya existe una cuenta con ese correo.";

/** Convierte el nombre visible en un slug estable y único dentro de la URL. */
function buildSlug(businessName: string): string {
  const base = businessName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "negocio"}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Da de alta usuario, negocio y membresía como una sola operación de negocio.
 * Si cualquier paso falla, deshace lo que ya se creó.
 */
export class RegisterAccount {
  constructor(private readonly provisioner: AccountProvisioner) {}

  async execute(input: unknown): Promise<RegisterAccountResult> {
    const parsed = registerAccountSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: RegisterAccountFieldErrors = {};
      const { businessName, email, password } = parsed.error.flatten().fieldErrors;
      if (businessName?.length) {
        fieldErrors.businessName = businessName[0];
      }
      if (email?.length) {
        fieldErrors.email = email[0];
      }
      if (password?.length) {
        fieldErrors.password = password[0];
      }
      return { ok: false, fieldErrors, error: null };
    }

    const { businessName, email, password } = parsed.data;
    let userId: string | undefined;
    let tenantId: string | undefined;

    try {
      userId = await this.provisioner.createUser({ email, password });
      tenantId = await this.provisioner.createTenant({
        name: businessName,
        slug: buildSlug(businessName),
      });
      await this.provisioner.addMember(tenantId, userId);

      return { ok: true, userId, tenantId };
    } catch (error) {
      await this.undo(userId, tenantId);

      if (error instanceof DuplicateEmailError) {
        return { ok: false, fieldErrors: {}, error: DUPLICATE_EMAIL_ERROR };
      }
      return { ok: false, fieldErrors: {}, error: GENERIC_ERROR };
    }
  }

  /**
   * Deshace una cuenta ya aprovisionada. La acción lo usa si el inicio de sesión
   * posterior al alta falla: ningún paso del registro puede dejar datos huérfanos.
   */
  async rollback(account: ProvisionedAccount): Promise<void> {
    await this.undo(account.userId, account.tenantId);
  }

  private async undo(userId?: string, tenantId?: string): Promise<void> {
    if (tenantId) {
      try {
        await this.provisioner.deleteTenant(tenantId);
      } catch {
        // El error original manda el mensaje; no se exponen detalles internos.
      }
    }
    if (userId) {
      try {
        await this.provisioner.deleteUser(userId);
      } catch {
        // Un fallo al deshacer no debe ocultar el motivo del alta.
      }
    }
  }
}
