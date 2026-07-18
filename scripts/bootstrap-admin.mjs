/**
 * Creates an admin auth user and assigns the admin role.
 * Requires migrations applied and SUPABASE_SERVICE_ROLE_KEY in .env.
 *
 * Usage: node --env-file=.env scripts/bootstrap-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME || "GridLoad Admin";

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
}
if (!email || !password) {
  fail("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
}
if (password.length < 8) {
  fail("ADMIN_PASSWORD must be at least 8 characters");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureAdminRole(userId) {
  const { data: existing, error: readError } = await admin
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    if (readError.message?.includes("does not exist") || readError.code === "42P01") {
      fail("user_roles table missing — run npm run db:push first");
    }
    throw readError;
  }

  if (existing?.role === "admin") {
    console.log("✓ User already has admin role");
    return;
  }

  const { error: upsertError } = await admin.from("user_roles").upsert(
    { user_id: userId, role: "admin" },
    { onConflict: "user_id,role" }
  );

  if (upsertError) throw upsertError;
  console.log("✓ Assigned admin role in user_roles");
}

async function ensureProfile(userId) {
  const { error } = await admin.from("profiles").upsert(
    { id: userId, email, full_name: fullName },
    { onConflict: "id" }
  );
  if (error && !error.message?.includes("does not exist")) {
    console.warn("⚠ Profile upsert:", error.message);
  } else if (!error) {
    console.log("✓ Profile ensured");
  }
}

console.log(`\nBootstrapping admin: ${email}`);

let user;

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createError) {
  if (createError.message?.includes("already been registered") || createError.status === 422) {
    console.log("→ User exists, looking up by email...");
    user = await findUserByEmail(email);
    if (!user) fail(`Could not find existing user: ${email}`);

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updateError) console.warn("⚠ Password update skipped:", updateError.message);
    else console.log("✓ Updated existing user password");
  } else {
    fail(createError.message);
  }
} else {
  user = created.user;
  console.log("✓ Created auth user");
}

await ensureProfile(user.id);
await ensureAdminRole(user.id);

console.log("\nDone. Log in at http://localhost:8080/login");
console.log(`  Email:    ${email}`);
console.log(`  Password: (value of ADMIN_PASSWORD in .env)`);
