// Crea (idempotente) la cuenta de entrega para los evaluadores: usuario con correo
// confirmado, negocio vacío y número de prueba de Meta ya ligado y "connected".
// Solo servidor. Nunca imprime la contraseña ni la llave de servicio.
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_DISPLAY_PHONE,
  DEFAULT_PHONE_NUMBER_ID,
  buildSlug,
  formatDisplayPhone,
  planNumber,
  type NumberRow,
  // @ts-expect-error TS5097: Node exige la extensión .mts en el import.
} from "./seed-evaluator-lib.mts";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = required("EVALUATOR_EMAIL");
const password = required("EVALUATOR_PASSWORD");
const businessName = process.env.EVALUATOR_BUSINESS_NAME?.trim() || DEFAULT_BUSINESS_NAME;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || DEFAULT_PHONE_NUMBER_ID;
const displayPhone = process.env.WHATSAPP_DISPLAY_PHONE?.trim() || DEFAULT_DISPLAY_PHONE;

async function findUserId(): Promise<string | undefined> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return undefined;
  }
}

async function findTenantId(userId: string): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.tenant_id;
}

async function numberBy(column: "phone_number_id" | "tenant_id", value: string) {
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("tenant_id, phone_number_id")
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  return (data as NumberRow | null) ?? null;
}

// 1) Validar el número antes de crear nada: si es ajeno, no se toca ni se crea cuenta.
let userId = await findUserId();
let tenantId = userId ? await findTenantId(userId) : undefined;
const byPhone = await numberBy("phone_number_id", phoneNumberId);
if (byPhone && byPhone.tenant_id !== tenantId) {
  fail(
    `el número ${phoneNumberId} ya pertenece a otro negocio; no se mueve. ` +
      "Libéralo manualmente si de verdad debe cambiar de dueño.",
  );
}
const byTenant = tenantId ? await numberBy("tenant_id", tenantId) : null;
const plan = planNumber(tenantId, byPhone, byTenant);
if (plan === "tenant-has-other-number") {
  fail("el negocio del evaluador ya tiene otro número ligado; no se sobrescribe.");
}

// 2) Usuario, negocio y membresía (mismas filas que RegisterAccount), deshaciendo lo creado si falla.
let createdUserId: string | undefined;
let createdTenantId: string | undefined;
try {
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = createdUserId = data.user.id;
  }
  if (!tenantId) {
    const { data, error } = await supabase
      .from("tenants")
      .insert({ name: businessName, slug: buildSlug(businessName) })
      .select("id")
      .single();
    if (error) throw error;
    tenantId = createdTenantId = data.id;
    // Rol por defecto del esquema ("operator"), igual que el registro.
    const member = await supabase
      .from("tenant_members")
      .insert({ tenant_id: tenantId, user_id: userId });
    if (member.error) throw member.error;
  }

  // 3) Número ya "connected": mismo estado que el usuario demo (supabase/seed.sql).
  const { error } = await supabase.from("whatsapp_numbers").upsert(
    {
      tenant_id: tenantId,
      phone_number_id: phoneNumberId,
      display_phone: displayPhone,
      status: "connected",
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw error;
} catch (error) {
  if (createdTenantId) await supabase.from("tenants").delete().eq("id", createdTenantId);
  if (createdUserId) await supabase.auth.admin.deleteUser(createdUserId);
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  fail(`no se pudo completar el alta (${message}). Se deshizo lo creado en esta corrida.`);
}

console.log(`Correo: ${email}`);
console.log(`Negocio: ${businessName}`);
console.log(`número ligado: ${formatDisplayPhone(displayPhone)} (listo)`);
