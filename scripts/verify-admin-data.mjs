/**
 * Sign in as admin and report row counts + dashboard RPC health.
 * Usage: node --env-file=.env scripts/verify-admin-data.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.ADMIN_EMAIL || "ibrahimimseeh@outlook.com";
const password = process.env.ADMIN_PASSWORD;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url || !anonKey) fail("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
if (!password) fail("Missing ADMIN_PASSWORD in .env");

const supabase = createClient(url, anonKey);

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) fail(`Login failed: ${authErr.message}`);

console.log(`✓ Logged in as ${email} (${auth.user.id})`);

const { data: roleRow, error: roleErr } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", auth.user.id)
  .maybeSingle();
if (roleErr) fail(`user_roles lookup failed: ${roleErr.message}`);
console.log(`✓ user_roles: ${roleRow?.role ?? "(none)"}`);
if (roleRow?.role !== "admin") {
  console.warn("⚠ Expected role=admin for /admin/dashboard access");
}

async function count(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) return { table, error: error.message };
  return { table, count };
}

const tables = ["customers", "purchase_orders", "bank_accounts", "products", "suppliers", "po_payments_out"];
console.log("\nRow counts:");
for (const t of tables) {
  const r = await count(t);
  if (r.error) console.log(`  ${t}: ERROR — ${r.error}`);
  else console.log(`  ${t}: ${r.count}`);
}

const { data: summary, error: sumErr } = await supabase.rpc("get_dashboard_summary");
if (sumErr) console.log(`\nget_dashboard_summary: ERROR — ${sumErr.message}`);
else console.log("\nget_dashboard_summary:", JSON.stringify(summary, null, 2));

const { data: ledger, error: ledErr } = await supabase
  .from("bank_ledger")
  .select("id", { count: "exact", head: true });
if (ledErr) console.log(`bank_ledger: ERROR — ${ledErr.message}`);
else console.log(`bank_ledger: ${ledger ?? "(count via separate query)"}`);

// head:true returns null data; recount ledger properly
const ledgerCount = await count("bank_ledger");
console.log(`bank_ledger: ${ledgerCount.count ?? ledgerCount.error}`);
