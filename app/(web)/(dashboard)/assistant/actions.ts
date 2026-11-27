"use server";

import { revalidatePath } from "next/cache";
import { composeAssistant } from "@/modules/business/composition";

export type AssistantActionState = { ok: boolean; message: string | null };

export async function saveAssistantConfigAction(
  _prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  try {
    const { saveAssistant, tenantId } = await composeAssistant();
    const name = String(formData.get("name") ?? "").trim();
    const tone = String(formData.get("tone") ?? "").trim();
    const voice = String(formData.get("voice") ?? "roberto");
    const language = String(formData.get("language") ?? "es-MX").trim();
    const greeting = String(formData.get("greeting") ?? "").trim();
    const escalationMessage = String(formData.get("escalationMessage") ?? "").trim();

    const result = await saveAssistant.execute(tenantId, {
      name: name || "Asistente",
      tone: tone || null,
      voice: voice === "eduardo" ? "eduardo" : "roberto",
      language: language || "es-MX",
      greeting: greeting || null,
      escalationMessage: escalationMessage || null,
    });
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/assistant");
    return { ok: true, message: "Configuración del asistente guardada." };
  } catch {
    return { ok: false, message: "No se pudo guardar la configuración. Inténtalo de nuevo." };
  }
}
