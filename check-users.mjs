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

const { data, error } = await admin.from("users").select("id, email").limit(5);
if (error) { console.log("ERR:", error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 2));
