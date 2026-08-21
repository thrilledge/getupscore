/**
 * One-time script to set admin flag on a user.
 * Run: node scripts/set-admin.mjs <email>
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kjfqtenfmxdoyjxxnhnm.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin.mjs <email>");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// List users to find the target
const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
  perPage: 1000,
});

if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

const target = usersData.users.find((u) => u.email === email);
if (!target) {
  console.error(`User with email "${email}" not found`);
  console.log("Available emails:", usersData.users.map((u) => u.email).filter(Boolean).join(", "));
  process.exit(1);
}

console.log(`Found user: ${target.email} (${target.id})`);
console.log(`Current app_metadata:`, JSON.stringify(target.app_metadata));

// Set is_admin flag
const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
  app_metadata: {
    ...target.app_metadata,
    is_admin: true,
  },
});

if (updateError) {
  console.error("Failed to update:", updateError.message);
  process.exit(1);
}

console.log(`✅ Successfully set is_admin=true for ${target.email}`);
