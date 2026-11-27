import type { GetBusinessContext } from "@/modules/business";

import type { BusinessContextReader } from "../application/ports";
import type { BusinessContext } from "../domain/BusinessContext";

/** Adapta el caso de uso de modules/business al puerto del asistente. */
export class BusinessContextReaderAdapter implements BusinessContextReader {
  constructor(private readonly getContext: GetBusinessContext) {}

  getBusinessContext(tenantId: string): Promise<BusinessContext> {
    return this.getContext.execute(tenantId);
  }
}
