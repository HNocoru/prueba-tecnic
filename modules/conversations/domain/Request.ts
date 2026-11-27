/**
 * Solicitud de un contacto dentro de un tenant.
 * El estado del chat es el de la solicitud más reciente del contacto.
 */
export type RequestStatus = "none" | "pending" | "in_progress" | "completed" | "cancelled";
export type RequestSource = "manual" | "ai";

export const REQUEST_STATUSES: readonly RequestStatus[] = [
  "none",
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

export const REQUEST_SOURCES: readonly RequestSource[] = ["manual", "ai"];

export interface ContactRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly contactId: string;
  readonly conversationId: string | null;
  readonly title: string;
  readonly status: RequestStatus;
  readonly amount: number | null;
  readonly source: RequestSource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** La solicitud más reciente por (created_at, id); `null` si no hay solicitudes. */
export function latestRequest(requests: readonly ContactRequest[]): ContactRequest | null {
  let latest: ContactRequest | null = null;
  for (const request of requests) {
    if (
      latest === null ||
      request.createdAt > latest.createdAt ||
      (request.createdAt === latest.createdAt && request.id > latest.id)
    ) {
      latest = request;
    }
  }
  return latest;
}
