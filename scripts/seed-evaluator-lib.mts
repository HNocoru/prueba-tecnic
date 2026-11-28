// Lógica pura del seed de evaluadores (sin red), separada para poder probarla.

export const DEFAULT_BUSINESS_NAME = "Negocio de prueba";
export const DEFAULT_PHONE_NUMBER_ID = "1370925136115469";
export const DEFAULT_DISPLAY_PHONE = "+15551652725";

/**
 * Copia mínima de buildSlug de modules/auth/application/RegisterAccount.ts.
 * Un script de Node no resuelve el alias "@/" ni importa módulos con "server-only",
 * así que no puede reutilizar el código de modules/ (ver DECISIONS, S29).
 */
export function buildSlug(businessName: string, suffix: string = crypto.randomUUID()): string {
  const base = businessName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "negocio"}-${suffix.slice(0, 8)}`;
}

/** Formatea +15551652725 como "+1 555 165 2725" para el mensaje final. */
export function formatDisplayPhone(displayPhone: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(displayPhone);
  return match ? `+1 ${match[1]} ${match[2]} ${match[3]}` : displayPhone;
}

export type NumberRow = { tenant_id: string; phone_number_id: string };

export type NumberPlan = "insert" | "update" | "owned-by-other" | "tenant-has-other-number";

/**
 * Decide qué hacer con el número sin mover nunca uno ajeno.
 * byPhone: fila con ese phone_number_id; byTenant: fila del tenant (UNIQUE tenant_id).
 */
export function planNumber(
  tenantId: string | undefined,
  byPhone: NumberRow | null,
  byTenant: NumberRow | null,
): NumberPlan {
  if (byPhone && byPhone.tenant_id !== tenantId) return "owned-by-other";
  if (byTenant && byTenant.phone_number_id !== byPhone?.phone_number_id) {
    return "tenant-has-other-number";
  }
  return byPhone ? "update" : "insert";
}
