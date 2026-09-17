import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envRaw = fs.readFileSync("D:\\upwork-jobs-ai\\.env.local", "utf8");
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.from("profiles").select("id, email, full_name").limit(10);
let table = "profiles";
if (error) {
  const { data: d2, error: e2 } = await admin.from("users").select("id, email").limit(10);
  table = "users";
  console.log("profiles ERR:", error.message);
  if (e2) { const { data: d3 } = await admin.rpc("get_users_now").maybeSingle(); console.log("rpc", JSON.stringify(d3)); console.log("users ERR:", e2.message); process.exit(1); }
  console.log("users =>", JSON.stringify(d2, null, 2));
} else {
  console.log(`${table} =>`, JSON.stringify(data, null, 2));
}
