/**
 * Creates sign-in accounts for the demo college so the admin flows can be tried.
 *
 *   npm run db:demo-users -- --password 'choose-a-strong-password'
 *
 * Creates (or reuses):
 *   collegeadmin@examplecollege.ac.in  College Admin for "vits"
 *   cse@examplecollege.ac.in           Department Admin for CSE
 *   ops@notifyhub.local                NotifyHub Super Admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (e.g. `set -a; source .env.local; set +a` first). Run supabase/seed.sql before this.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pwIndex = process.argv.indexOf("--password");
const password = pwIndex > -1 ? process.argv[pwIndex + 1] : undefined;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
if (!password || password.length < 10) {
  console.error("Pass --password with at least 10 characters. Demo passwords are never hard-coded.");
  process.exit(1);
}

const COLLEGE_ID = "00000000-0000-4000-8000-000000000001";
const CSE_ID = "00000000-0000-4000-8000-0000000000d1";
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function ensureUser(email: string, name: string) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

async function main() {
  const collegeAdmin = await ensureUser("collegeadmin@examplecollege.ac.in", "Demo College Admin");
  const cseAdmin = await ensureUser("cse@examplecollege.ac.in", "Demo CSE Admin");
  const superAdmin = await ensureUser("ops@notifyhub.local", "NotifyHub Operations");

  const { error: e1 } = await supabase.from("admins").upsert(
    [
      { college_id: COLLEGE_ID, user_id: collegeAdmin, name: "Demo College Admin", email: "collegeadmin@examplecollege.ac.in", role: "college_admin", department_id: null },
      { college_id: COLLEGE_ID, user_id: cseAdmin, name: "Demo CSE Admin", email: "cse@examplecollege.ac.in", role: "department_admin", department_id: CSE_ID },
    ],
    { onConflict: "college_id,user_id" },
  );
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("platform_admins").upsert({ user_id: superAdmin });
  if (e2) throw e2;

  console.log("Demo accounts ready:");
  console.log("  collegeadmin@examplecollege.ac.in  (College Admin, vits)");
  console.log("  cse@examplecollege.ac.in           (Department Admin, CSE)");
  console.log("  ops@notifyhub.local                (Super Admin)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
