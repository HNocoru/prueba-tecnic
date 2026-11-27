import { serverEnv } from "@/shared/env.server";
import { createAdminClient } from "@/shared/supabase/admin";

import { SummarizeCall } from "./application/SummarizeCall";
import { SummarizeConversation } from "./application/SummarizeConversation";
import type { CallMemoryRepository, SummaryLlmPort } from "./application/ports";
import { GroqSummaryLlmAdapter } from "./infrastructure/GroqSummaryLlmAdapter";
import { SupabaseCallMemoryRepository } from "./infrastructure/SupabaseCallMemoryRepository";

/** Composition root del módulo; el mismo repositorio sirve para escribir y para GetCallContext. */
type AdminDb = ReturnType<typeof createAdminClient>;

export function createMemoryApi(db: AdminDb = createAdminClient()): {
  summarize: SummarizeCall;
  summarizeConversation: SummarizeConversation;
  repository: CallMemoryRepository;
} {
  const repository = new SupabaseCallMemoryRepository(db);
  const llm = composeLlm();
  return {
    summarize: new SummarizeCall(repository, llm),
    summarizeConversation: new SummarizeConversation(repository, llm),
    repository,
  };
}

function composeLlm(): SummaryLlmPort {
  return new GroqSummaryLlmAdapter({
    apiKey: serverEnv.GROQ_API_KEY,
    model: serverEnv.LLM_MODEL,
  });
}
