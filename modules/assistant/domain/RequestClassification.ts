export type RequestAction = "none" | "create" | "update";
export type AiRequestStatus = "pending" | "in_progress" | "cancelled";

export interface RequestClassification {
  readonly action: RequestAction;
  readonly title?: string;
  readonly status?: AiRequestStatus;
}

export interface OpenRequest {
  readonly id: string;
  readonly title: string;
  readonly status: "pending" | "in_progress";
  readonly amount: number | null;
}

export interface CatalogPriceItem {
  readonly name: string;
  readonly price: number | null;
  readonly currency: string;
}

export function normalizeRequestTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findEquivalentOpenRequest(
  openRequests: readonly OpenRequest[],
  title: string,
): OpenRequest | null {
  const normalized = normalizeRequestTitle(title);
  return (
    openRequests.find((request) => normalizeRequestTitle(request.title) === normalized) ?? null
  );
}

export function resolveCatalogAmount(
  catalog: readonly CatalogPriceItem[],
  title: string,
): number | null {
  const normalized = normalizeRequestTitle(title);
  const exact = catalog.find((item) => normalizeRequestTitle(item.name) === normalized);
  if (exact) return exact.price;
  const partial = catalog.find((item) => {
    const name = normalizeRequestTitle(item.name);
    return name.includes(normalized) || normalized.includes(name);
  });
  return partial?.price ?? null;
}
