/**
 * Verifies Supabase connectivity and whether the app schema exists.
 * Usage: node --env-file=.env scripts/check-supabase.mjs
 */

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

if (!url || !anonKey) {
  fail("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

ok(`Supabase URL: ${url}`);

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

async function probeTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers });
  return { table, status: res.status, ok: res.ok, body: res.ok ? await res.json() : await res.text() };
}

const coreTables = ["user_roles", "profiles", "products", "customers", "sales"];

console.log("\nChecking core tables (anon key)...");
let schemaReady = true;

for (const table of coreTables) {
  const result = await probeTable(table);
  if (result.status === 404 || result.body?.includes?.("does not exist")) {
    console.log(`✗ ${table} — not found (migrations not applied?)`);
    schemaReady = false;
  } else if (result.status === 401 || result.status === 403) {
    ok(`${table} — exists (RLS blocked anon read, expected)`);
  } else if (result.ok) {
    ok(`${table} — reachable`);
  } else {
    console.log(`? ${table} — HTTP ${result.status}`);
    if (result.status >= 500) schemaReady = false;
  }
}

if (!schemaReady) {
  console.log("\n→ Schema missing. Run: npm run db:push");
} else {
  ok("Schema looks present");
}

if (serviceKey) {
  ok("SUPABASE_SERVICE_ROLE_KEY is set — bootstrap scripts can run");
} else {
  console.log("\n→ Add SUPABASE_SERVICE_ROLE_KEY to .env to enable admin bootstrap");
}

console.log("\nNext steps:");
console.log("  1. npx supabase login && npx supabase link --project-ref qhvrielzimyihnnbnajr");
console.log("  2. npm run db:push");
console.log("  3. Set ADMIN_EMAIL + ADMIN_PASSWORD in .env, then: npm run bootstrap:admin");
console.log("  4. npm run dev  →  http://localhost:8080/login");
