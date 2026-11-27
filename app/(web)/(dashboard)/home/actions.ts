"use server";

import { revalidatePath } from "next/cache";

import { composeWhatsAppConnection } from "@/modules/channels/whatsapp/composition";

import { resolveTenantId } from "./tenant";

export type ConnectFormState = { ok: boolean; error: string | null };

/** Entrada delgada: verifica sesión, resuelve tenant y delega al caso de uso. */
export async function connectWhatsAppNumber(
  _prev: ConnectFormState,
  formData: FormData,
): Promise<ConnectFormState> {
  const tenantId = await resolveTenantId();
  if (!tenantId) return { ok: false, error: "Tu sesión expiró o no tienes un negocio asignado." };

  try {
    const result = await composeWhatsAppConnection().connect.execute(tenantId, {
      displayPhone: String(formData.get("displayPhone") ?? "").trim(),
    });
    if (!result.ok) return { ok: false, error: result.error };
  } catch {
    return { ok: false, error: "No pudimos guardar el número. Intenta de nuevo." };
  }
  revalidatePath("/home");
  return { ok: true, error: null };
}
