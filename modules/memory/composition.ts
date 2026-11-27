import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { SummarizeCall } from "./application/SummarizeCall";
import type { CallMemoryRepository, SummaryLlmPort } from "./application/ports";
import { GroqSummaryLlmAdapter } from "./infrastructure/GroqSummaryLlmAdapter";
import { SupabaseCallMemoryRepository } from "./infrastructure/SupabaseCallMemoryRepository";

/** Composition root del módulo; el mismo repositorio sirve para escribir y para GetCallContext. */
type AdminDb = ReturnType<typeof createAdminClient>;

export function createMemoryApi(db: AdminDb = createAdminClient()): {
  summarize: SummarizeCall;
  repository: CallMemoryRepository;
} {
  const repository = new SupabaseCallMemoryRepository(db);
  return { summarize: new SummarizeCall(repository, composeLlm()), repository };
}

function composeLlm(): SummaryLlmPort {
  return new GroqSummaryLlmAdapter({
    apiKey: serverEnv.GROQ_API_KEY,
    model: serverEnv.LLM_MODEL,
  });
}
