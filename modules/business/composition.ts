import { createClient } from "@/shared/supabase/server";
import { SupabaseBusinessRepository } from "./infrastructure/SupabaseBusinessRepository";
import { GetBusinessContext } from "./application/GetBusinessContext";
import { GetBusinessProfileRaw } from "./application/GetBusinessProfileRaw";
import { SaveBusinessProfile } from "./application/SaveBusinessProfile";
import { SaveBusinessHours } from "./application/SaveBusinessHours";
import { SaveCatalogItems } from "./application/SaveCatalogItems";
import { SaveFaqs } from "./application/SaveFaqs";
import { SaveAssistantConfig } from "./application/SaveAssistantConfig";

async function resolveSessionTenant(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  tenantId: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_tenant");
  if (error || !data?.length) {
    throw new Error("No se pudo resolver el tenant de la sesión");
  }
  return { supabase, tenantId: data[0] };
}

export async function composeBusiness(): Promise<{
  getBusinessContext: GetBusinessContext;
  getProfileRaw: GetBusinessProfileRaw;
  listHours: () => Promise<{ weekday: number; opens: string; closes: string }[]>;
  listCatalog: () => Promise<
    {
      id: string;
      kind: "product" | "service";
      name: string;
      description: string | null;
      price: number | null;
      currency: string;
      active: boolean;
    }[]
  >;
  listFaqs: () => Promise<{ id: string; question: string; answer: string; position: number }[]>;
  saveProfile: SaveBusinessProfile;
  saveHours: SaveBusinessHours;
  saveCatalog: SaveCatalogItems;
  saveFaqs: SaveFaqs;
  tenantId: string;
}> {
  const { supabase, tenantId } = await resolveSessionTenant();
  const repository = new SupabaseBusinessRepository(supabase);
  return {
    getBusinessContext: new GetBusinessContext(repository),
    getProfileRaw: new GetBusinessProfileRaw(repository),
    listHours: () => repository.listHours(tenantId),
    listCatalog: () => repository.listCatalogItems(tenantId),
    listFaqs: () => repository.listFaqs(tenantId),
    saveProfile: new SaveBusinessProfile(repository),
    saveHours: new SaveBusinessHours(repository),
    saveCatalog: new SaveCatalogItems(repository),
    saveFaqs: new SaveFaqs(repository),
    tenantId,
  };
}

export async function composeAssistant(): Promise<{
  saveAssistant: SaveAssistantConfig;
  getAssistantRaw: () => Promise<{
    name: string;
    tone: string | null;
    voice: "roberto" | "eduardo";
    language: string;
    greeting: string | null;
    escalationMessage: string | null;
  }>;
  tenantId: string;
}> {
  const { supabase, tenantId } = await resolveSessionTenant();
  const repository = new SupabaseBusinessRepository(supabase);
  return {
    saveAssistant: new SaveAssistantConfig(repository),
    getAssistantRaw: () => repository.getAssistantConfig(tenantId),
    tenantId,
  };
}
