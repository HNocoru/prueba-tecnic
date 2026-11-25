// Crea (idempotente) el usuario demo y lo vincula al tenant demo. Solo servidor/local.
import { createClient } from "@supabase/supabase-js";

const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = required("DEMO_USER_EMAIL");
const password = required("DEMO_USER_PASSWORD");

async function findUserId(): Promise<string | undefined> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return undefined;
  }
}

let userId = await findUserId();
if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
}

const { error } = await supabase
  .from("tenant_members")
  .upsert({ tenant_id: DEMO_TENANT_ID, user_id: userId }, { onConflict: "tenant_id,user_id" });
if (error) throw error;
console.log(`Usuario demo listo: ${email} -> tenant demo`);
