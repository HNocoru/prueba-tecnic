import { z } from "zod";

import type { BusinessContext } from "../domain/BusinessContext";
import type { ConversationTurn } from "../domain/ConversationTurn";
import {
  findEquivalentOpenRequest,
  resolveCatalogAmount,
  type OpenRequest,
  type RequestClassification,
} from "../domain/RequestClassification";

const REQUEST_CLASSIFICATION_SCHEMA = z.object({
  action: z.enum(["none", "create", "update"]),
  title: z.string().trim().min(1).optional(),
  status: z.enum(["pending", "in_progress", "cancelled"]).optional(),
});

export interface RequestWriteCommand {
  readonly action: "create" | "update";
  readonly requestId?: string;
  readonly title: string;
  readonly status: "pending" | "in_progress" | "cancelled";
  readonly amount: number | null;
}

export function buildRequestClassificationSystem(
  context: BusinessContext,
  openRequests: readonly OpenRequest[],
): string {
  const catalog = context.catalog
    .map((item) => `- ${item.name} | ${item.price ?? "sin precio"} ${item.currency}`)
    .join("\n");
  const open = openRequests
    .map((request) => `- ${request.id} | ${request.status} | ${request.title}`)
    .join("\n");
  return [
    "Eres un clasificador interno. Responde SOLO con JSON válido, sin markdown ni texto extra.",
    'Formato: {"action":"none"|"create"|"update","title":"...","status":"pending"|"in_progress"|"cancelled"}',
    "Reglas:",
    "- Usa create solo cuando el cliente pide claramente un producto/servicio del catálogo.",
    "- Usa update solo para una solicitud abierta existente.",
    "- No inventes títulos fuera del catálogo; usa el nombre del catálogo.",
    '- Si no hay acción clara, responde {"action":"none"}.',
    "",
    "Catálogo:",
    catalog || "- (vacío)",
    "",
    "Solicitudes abiertas del contacto:",
    open || "- (ninguna)",
  ].join("\n");
}

export function decideRequestWrite(
  classification: RequestClassification | null,
  openRequests: readonly OpenRequest[],
  context: BusinessContext,
): RequestWriteCommand | null {
  if (!classification || classification.action === "none") return null;

  if (classification.action === "create") {
    if (classification.status && classification.status !== "pending") return null;
    const title = classification.title?.trim();
    if (!title) return null;
    const equivalent = findEquivalentOpenRequest(openRequests, title);
    const amount = resolveCatalogAmount(context.catalog, title);
    if (equivalent) {
      return {
        action: "update",
        requestId: equivalent.id,
        title: equivalent.title,
        status: equivalent.status,
        amount,
      };
    }
    // Importe solo sale del catálogo; título debe corresponder a un ítem del catálogo.
    if (resolveCatalogAmount(context.catalog, title) === null && !catalogHasTitle(context, title)) {
      return null;
    }
    return { action: "create", title, status: "pending", amount };
  }

  if (classification.action === "update") {
    const title = classification.title?.trim();
    const target = title
      ? findEquivalentOpenRequest(openRequests, title)
      : openRequests.length === 1
        ? openRequests[0]
        : null;
    if (!target) return null;
    const nextStatus = classification.status;
    if (!nextStatus) return null;
    if (nextStatus === "in_progress" && target.status !== "pending") return null;
    if (nextStatus === "pending") return null;
    return {
      action: "update",
      requestId: target.id,
      title: target.title,
      status: nextStatus,
      amount: resolveCatalogAmount(context.catalog, target.title),
    };
  }

  return null;
}

function catalogHasTitle(context: BusinessContext, title: string): boolean {
  const normalized = title.trim().replace(/\s+/g, " ").toLowerCase();
  return context.catalog.some(
    (item) => item.name.trim().replace(/\s+/g, " ").toLowerCase() === normalized,
  );
}

export function parseClassificationOutput(raw: string): RequestClassification | null {
  const trimmed = raw.trim();
  const candidate = trimmed.startsWith("```")
    ? trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()
    : trimmed;
  try {
    const parsed: unknown = JSON.parse(candidate);
    const result = REQUEST_CLASSIFICATION_SCHEMA.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function toClassificationUserMessage(history: readonly ConversationTurn[]): string {
  const recent = history
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "cliente" : "asistente"}: ${turn.body}`)
    .join("\n");
  return `Historial reciente:\n${recent}\n\nDevuelve solo el JSON de clasificación.`;
}
