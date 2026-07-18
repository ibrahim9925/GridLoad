/**
 * CRUD smoke test for core admin tables (create → update → delete).
 * Usage: node --env-file=.env scripts/crud-smoke-test.mjs
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
const tag = `smoke-${Date.now()}`;

const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) fail(`Login failed: ${authErr.message}`);
console.log(`✓ Logged in as ${email}\n`);

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

await test("customers CRUD", async () => {
  const { data: created, error: cErr } = await supabase
    .from("customers")
    .insert({ contact_person: `Test ${tag}`, email: `${tag}@test.com`, phone: "0599000000" })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await supabase.from("customers").update({ company_name: "Updated Co" }).eq("id", created.id);
  if (uErr) throw uErr;
  const { error: dErr } = await supabase.from("customers").delete().eq("id", created.id);
  if (dErr) throw dErr;
});

await test("products CRUD", async () => {
  const { data: created, error: cErr } = await supabase
    .from("products")
    .insert({ name: `Product ${tag}`, sku: `SKU-${tag}`, reorder_point: 0, current_stock: 1 })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await supabase.from("products").update({ category: "Other" }).eq("id", created.id);
  if (uErr) throw uErr;
  const { error: dErr } = await supabase.from("products").delete().eq("id", created.id);
  if (dErr) throw dErr;
});

await test("suppliers CRUD", async () => {
  const { data: created, error: cErr } = await supabase
    .from("suppliers")
    .insert({ name: `Supplier ${tag}`, contact_person: "Test", email: `${tag}-sup@test.com` })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await supabase.from("suppliers").update({ phone: "0599111111" }).eq("id", created.id);
  if (uErr) throw uErr;
  const { error: dErr } = await supabase.from("suppliers").delete().eq("id", created.id);
  if (dErr) throw dErr;
});

await test("leads CRUD", async () => {
  const { data: created, error: cErr } = await supabase
    .from("leads")
    .insert({ name: `Lead ${tag}`, email: `${tag}-lead@test.com`, status: "new", value: 5000 })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await supabase.from("leads").update({ status: "contacted" }).eq("id", created.id);
  if (uErr) throw uErr;
  const { error: dErr } = await supabase.from("leads").delete().eq("id", created.id);
  if (dErr) throw dErr;
});

await test("expenses CRUD", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: created, error: cErr } = await supabase
    .from("expenses")
    .insert({
      category: "other",
      amount: 100,
      expense_date: new Date().toISOString().split("T")[0],
      description: `Expense ${tag}`,
      ...(user?.id ? { created_by: user.id } : {}),
    })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await supabase.from("expenses").update({ amount: 150 }).eq("id", created.id);
  if (uErr) throw uErr;
  const { error: dErr } = await supabase.from("expenses").delete().eq("id", created.id);
  if (dErr) throw dErr;
});

await test("sales + payments CRUD", async () => {
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .insert({ contact_person: `Sale Cust ${tag}`, email: `${tag}-sale@test.com` })
    .select("id")
    .single();
  if (custErr) throw custErr;

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({ name: `Sale Prod ${tag}`, sku: `SALE-${tag}`, reorder_point: 0, current_stock: 5 })
    .select("id")
    .single();
  if (prodErr) throw prodErr;

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      customer_id: customer.id,
      sale_date: new Date().toISOString().split("T")[0],
      total_amount: 1000,
      amount_nis: 1000,
      currency: "NIS",
      payment_status: "unpaid",
      status: "confirmed",
    })
    .select("id")
    .single();
  if (saleErr) throw saleErr;

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      sale_id: sale.id,
      customer_id: customer.id,
      amount: 500,
      amount_nis: 500,
      nis_equivalent: 500,
      currency: "NIS",
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
      status: "completed",
    })
    .select("id")
    .single();
  if (payErr) throw payErr;

  const { error: payUpdErr } = await supabase.from("payments").update({ notes: "updated" }).eq("id", payment.id);
  if (payUpdErr) throw payUpdErr;

  await supabase.from("payments").delete().eq("id", payment.id);
  await supabase.from("sales").delete().eq("id", sale.id);
  await supabase.from("products").delete().eq("id", product.id);
  await supabase.from("customers").delete().eq("id", customer.id);
});

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`\n${passed}/${results.length} passed`);
if (failed.length) {
  console.error("\nFailed:");
  for (const f of failed) console.error(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
