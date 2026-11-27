import { after } from "next/server";

import type { SummarizeCall } from "@/modules/memory";

import type { ScheduleCallSummary } from "../application/ports";

/**
 * Programa el resumen con after(): el POST /end responde sin esperar al LLM. Los fallos se
 * registran con un código fijo, nunca con el mensaje del proveedor ni con texto del cliente.
 */
export class AfterCallSummary implements ScheduleCallSummary {
  constructor(private readonly summarize: SummarizeCall) {}

  schedule(tenantId: string, callId: string): void {
    after(async () => {
      try {
        const result = await this.summarize.execute(tenantId, callId);
        if (result.status === "failed") {
          console.warn("No se pudo generar la memoria de la llamada:", result.reason);
        }
      } catch (error) {
        console.warn(
          "No se pudo generar la memoria de la llamada:",
          error instanceof Error ? error.name : "error desconocido",
        );
      }
    });
  }
}
