"use server";

import { revalidatePath } from "next/cache";
import { composeBusiness } from "@/modules/business/composition";

export type BusinessActionState = { ok: boolean; message: string | null };

export async function saveBusinessProfileAction(
  _prev: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  try {
    const { saveProfile, tenantId } = await composeBusiness();
    const legalName = String(formData.get("legalName") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "").trim();
    const policies = String(formData.get("policies") ?? "").trim();
    const contactPhone = String(formData.get("contactPhone") ?? "").trim();

    const result = await saveProfile.execute(tenantId, {
      legalName: legalName || null,
      description: description || null,
      address: address || null,
      timezone: timezone || "America/Mexico_City",
      policies: policies || null,
      contactPhone: contactPhone || null,
    });
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/business");
    return { ok: true, message: "Perfil del negocio guardado." };
  } catch {
    return { ok: false, message: "No se pudo guardar el perfil. Inténtalo de nuevo." };
  }
}

function parseJsonField(formData: FormData, name: string): unknown {
  const raw = String(formData.get(name) ?? "");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveBusinessHoursAction(
  _prev: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  try {
    const { saveHours, tenantId } = await composeBusiness();
    const hours = parseJsonField(formData, "hours");
    const result = await saveHours.execute(tenantId, hours);
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/business");
    return { ok: true, message: "Horarios guardados." };
  } catch {
    return { ok: false, message: "No se pudieron guardar los horarios. Inténtalo de nuevo." };
  }
}

export async function saveCatalogItemsAction(
  _prev: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  try {
    const { saveCatalog, tenantId } = await composeBusiness();
    const items = parseJsonField(formData, "items");
    const result = await saveCatalog.execute(tenantId, items);
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/business");
    return { ok: true, message: "Catálogo guardado." };
  } catch {
    return { ok: false, message: "No se pudo guardar el catálogo. Inténtalo de nuevo." };
  }
}

export async function saveFaqsAction(
  _prev: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  try {
    const { saveFaqs, tenantId } = await composeBusiness();
    const faqs = parseJsonField(formData, "faqs");
    const result = await saveFaqs.execute(tenantId, faqs);
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/business");
    return { ok: true, message: "Preguntas frecuentes guardadas." };
  } catch {
    return {
      ok: false,
      message: "No se pudieron guardar las preguntas frecuentes. Inténtalo de nuevo.",
    };
  }
}
