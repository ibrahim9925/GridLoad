import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sb = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateString = (value?: string | null, fallback = new Date()) => {
  const parsed = value ? new Date(value) : fallback;
  const safe = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  return safe.toISOString().split("T")[0];
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const makeCustomerNumber = (count: number) =>
  `CUST-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

const customerName = (customer: any) =>
  customer?.contact_person || customer?.company_name || null;

const saleStatus = (sale: any) => sale?.status || sale?.payment_status || "pending";

const paymentTypeToCostCategory = (type?: string | null) => {
  switch (type) {
    case "freight":
      return "freight";
    case "clearance":
      return "customs";
    default:
      return "supplier_payment";
  }
};

const getRateToNis = async (supabase: ReturnType<typeof sb>, currency?: string | null, date?: string | null) => {
  const code = (currency || "NIS").toUpperCase() === "ILS" ? "NIS" : (currency || "NIS").toUpperCase();
  if (code === "NIS") return 1;

  const { data, error } = await supabase.rpc("get_exchange_rate", {
    p_from_currency: code,
    p_to_currency: "NIS",
    p_date: toDateString(date ?? undefined),
  });

  if (error) throw new Error(error.message);
  return toNumber(data, 1);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/zara-api/, "").replace(/\/+$/, "") || "/";
    const supabase = sb();
    const method = req.method.toUpperCase();

    // ===================== Reconciliation =====================
    if (method === "GET" && path === "/reconciliation/pending") {
      const { data, error } = await supabase.rpc("get_pending_reconciliation");
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    // ===================== PO + Shipments =====================
    const poStatusMatch = path.match(new RegExp(`^/po/${UUID}/status$`, "i"));
    if (method === "GET" && poStatusMatch) {
      const { data, error } = await supabase.rpc("get_po_status", { p_po_id: poStatusMatch[1] });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    if (method === "GET" && path === "/shipments/active") {
      const { data, error } = await supabase.rpc("get_active_shipments");
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    // ===================== Banking =====================
    if (method === "GET" && path === "/bank/position") {
      const { data, error } = await supabase.rpc("get_bank_position");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (method === "POST" && path === "/bank/transfer") {
      const body = await req.json().catch(() => ({}));
      const { from_account_id, to_account_id, from_amount, exchange_rate, reference, notes } = body || {};
      if (!from_account_id || !to_account_id || !from_amount) {
        return json({ error: "from_account_id, to_account_id, from_amount are required" }, 400);
      }
      const { data, error } = await supabase.rpc("record_internal_transfer", {
        p_from_account: from_account_id,
        p_to_account: to_account_id,
        p_from_amount: from_amount,
        p_exchange_rate: exchange_rate ?? null,
        p_reference: reference ?? null,
        p_notes: notes ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ transfer_id: data });
    }

    // ===================== Cash bundles =====================
    if (method === "GET" && path === "/cash/bundles") {
      const { data, error } = await supabase.rpc("get_open_cash_bundles");
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }
    if (method === "GET" && path === "/cash/summary") {
      const { data, error } = await supabase.rpc("get_cash_summary");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    const spendMatch = path.match(new RegExp(`^/cash/bundle/${UUID}/spend$`, "i"));
    if (method === "POST" && spendMatch) {
      const body = await req.json().catch(() => ({}));
      const { amount, category, description, vendor } = body || {};
      if (!amount || amount <= 0) return json({ error: "amount required > 0" }, 400);
      const { data, error } = await supabase.rpc("spend_from_bundle", {
        p_bundle_id: spendMatch[1],
        p_amount: amount,
        p_category: category ?? "misc",
        p_description: description ?? "Cash bundle spend",
        p_vendor: vendor ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ expense_id: data });
    }

    // ===================== Dashboard / Overdue =====================
    if (method === "GET" && path === "/dashboard/summary") {
      const { data, error } = await supabase.rpc("get_dashboard_summary");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    if (method === "GET" && path === "/overdue") {
      const { data, error } = await supabase.rpc("get_overdue_invoices");
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }
    if (method === "GET" && path === "/overdue/summary") {
      const { data, error } = await supabase.rpc("get_overdue_summary");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ===================== Customer endpoints =====================
    if (method === "POST" && path === "/customer/create") {
      const body = await req.json().catch(() => ({}));
      const name = String(body?.name || "").trim();
      const phone = body?.phone ? String(body.phone).trim() : null;
      const area = body?.area || body?.region ? String(body.area || body.region).trim() : null;
      const companyName = body?.company_name ? String(body.company_name).trim() : null;
      const paymentTermsDays = Math.max(0, toNumber(body?.payment_terms_days, 7));

      if (!name) return json({ error: "name is required" }, 400);

      const { count, error: countError } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true });
      if (countError) return json({ error: countError.message }, 500);

      const { data, error } = await supabase
        .from("customers")
        .insert({
          contact_person: name,
          phone,
          area,
          company_name: companyName,
          payment_terms_days: paymentTermsDays,
          payment_terms: `${paymentTermsDays} days`,
          preferred_currency: "NIS",
          is_active: true,
        })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 400);

      return json({
        customer_id: (data as any).id,
        customer_number: makeCustomerNumber(count ?? 0),
      });
    }

    if (method === "GET" && path === "/customer/search") {
      const name = (url.searchParams.get("name") || "").trim();
      if (!name) return json({ error: "name query param required" }, 400);
      const { data: rows, error } = await supabase
        .from("customers")
        .select("id, contact_person, company_name, phone, payment_terms_days")
        .or(`contact_person.ilike.%${name}%,company_name.ilike.%${name}%`)
        .limit(5);
      if (error) return json({ error: error.message }, 500);
      const results = await Promise.all(
        (rows || []).map(async (c: any) => {
          const { data: bal } = await supabase.rpc("get_customer_balance", { p_customer_id: c.id });
          return {
            id: c.id,
            name: c.contact_person || c.company_name,
            phone: c.phone,
            outstanding_balance_nis: bal?.outstanding_nis ?? 0,
            payment_terms_days: c.payment_terms_days,
          };
        }),
      );
      return json({ count: results.length, items: results });
    }

    const ptMatch = path.match(new RegExp(`^/customer/${UUID}/payment-terms$`, "i"));
    if (method === "PATCH" && ptMatch) {
      const body = await req.json().catch(() => ({}));
      if (!("days" in body)) return json({ error: "days field required (number or null)" }, 400);
      const days = body.days === null ? null : Number(body.days);
      if (days !== null && (!Number.isFinite(days) || days < 0)) {
        return json({ error: "days must be null or a non-negative integer" }, 400);
      }
      const { error } = await supabase
        .from("customers")
        .update({ payment_terms_days: days })
        .eq("id", ptMatch[1]);
      if (error) return json({ error: error.message }, 400);
      return json({ customer_id: ptMatch[1], payment_terms_days: days });
    }

    const remMatch = path.match(new RegExp(`^/customer/${UUID}/reminder$`, "i"));
    if (method === "POST" && remMatch) {
      const body = await req.json().catch(() => ({}));
      const { message, scheduled_for } = body || {};
      if (!message || typeof message !== "string") return json({ error: "message required" }, 400);
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          customer_id: remMatch[1],
          message,
          scheduled_for: scheduled_for || new Date().toISOString(),
          status: "pending",
        })
        .select("id, scheduled_for")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (method === "GET" && path === "/reminders/pending") {
      const { data, error } = await supabase
        .from("reminders")
        .select("id, customer_id, message, scheduled_for, status, created_at")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    const balMatch = path.match(new RegExp(`^/customer/${UUID}/balance$`, "i"));
    if (method === "GET" && balMatch) {
      const cid = balMatch[1];
      const [bal, cust, lastPay] = await Promise.all([
        supabase.rpc("get_customer_balance", { p_customer_id: cid }),
        supabase.from("customers").select("preferred_currency").eq("id", cid).single(),
        supabase.from("payments")
          .select("payment_date, amount, nis_equivalent, original_currency")
          .eq("customer_id", cid)
          .eq("status", "completed")
          .order("payment_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (bal.error) return json({ error: bal.error.message }, 500);
      return json({
        ...(bal.data as any),
        currency: (cust.data as any)?.preferred_currency || "NIS",
        last_payment_date: (lastPay.data as any)?.payment_date || null,
        last_payment_amount: (lastPay.data as any)?.nis_equivalent || (lastPay.data as any)?.amount || null,
      });
    }

    const invMatch = path.match(new RegExp(`^/customer/${UUID}/invoices$`, "i"));
    if (method === "GET" && invMatch) {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), 100);
      const { data, error } = await supabase
        .from("sales")
        .select("id, sale_number, invoice_number, sale_date, total_amount, currency, status, payment_status")
        .eq("customer_id", invMatch[1])
        .order("sale_date", { ascending: false })
        .limit(limit);
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    const stmtMatch = path.match(new RegExp(`^/customer/${UUID}/statement$`, "i"));
    if (method === "GET" && stmtMatch) {
      const { data, error } = await supabase.rpc("get_customer_ledger", { p_customer_id: stmtMatch[1] });
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    const payMatch = path.match(new RegExp(`^/customer/${UUID}/payment$`, "i"));
    if (method === "POST" && payMatch) {
      const body = await req.json().catch(() => ({}));
      const { amount, currency, payment_method, bank_account_id, reference_number, invoice_id, payment_date, nis_equivalent } = body || {};
      if (!amount || amount <= 0) return json({ error: "amount required > 0" }, 400);
      if (!payment_method) return json({ error: "payment_method required" }, 400);
      const { data, error } = await supabase
        .from("payments")
        .insert({
          customer_id: payMatch[1],
          sale_id: invoice_id ?? null,
          amount,
          original_amount: amount,
          original_currency: currency || "NIS",
          nis_equivalent: nis_equivalent ?? (currency && currency !== "NIS" ? null : amount),
          payment_method,
          bank_account_id: bank_account_id ?? null,
          reference_number: reference_number ?? null,
          payment_date: payment_date || new Date().toISOString(),
          status: "completed",
        })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ payment_id: (data as any).id });
    }

    // ===================== Warranty =====================
    if (method === "POST" && path === "/warranty/create") {
      const body = await req.json().catch(() => ({}));
      const customer_id = body?.customer_id || null;
      const product_id = body?.product_id || null;
      const serial_number = body?.serial_number ? String(body.serial_number).trim() : null;
      const warranty_months = Math.max(1, toNumber(body?.warranty_months, 12));
      const startDate = toDateString(body?.warranty_start_date);
      const expiry = addDays(new Date(`${startDate}T00:00:00.000Z`), warranty_months * 30);
      const expiryDate = expiry.toISOString().split("T")[0];

      if (!customer_id || !product_id || !serial_number) {
        return json({ error: "customer_id, product_id, and serial_number are required" }, 400);
      }

      const { data, error } = await supabase
        .from("warranties")
        .insert({
          customer_id,
          product_id,
          serial_number,
          warranty_start_date: startDate,
          warranty_end_date: expiryDate,
          start_date: startDate,
          end_date: expiryDate,
          expiry_date: expiryDate,
          warranty_period_months: warranty_months,
          warranty_type: "manual",
          status: "active",
        })
        .select("id, expiry_date, warranty_end_date")
        .single();
      if (error) return json({ error: error.message }, 400);

      return json({
        warranty_id: (data as any).id,
        expiry_date: (data as any).expiry_date || (data as any).warranty_end_date,
      });
    }

    const warrMatch = path.match(/^\/warranty\/(.+)$/i);
    if (method === "GET" && warrMatch) {
      const serial = decodeURIComponent(warrMatch[1]);
      const { data, error } = await supabase
        .from("warranties")
        .select(`
          id, warranty_number, expiry_date, status, serial_number,
          products(name),
          customers(contact_person, company_name),
          warranty_claims(id, status, claim_date, description)
        `)
        .eq("serial_number", serial)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Warranty not found for serial" }, 404);
      const w: any = data;
      return json({
        warranty_number: w.warranty_number,
        serial: w.serial_number,
        status: w.status,
        expiry_date: w.expiry_date,
        product_name: w.products?.name ?? null,
        customer_name: w.customers?.contact_person || w.customers?.company_name || null,
        open_claims: (w.warranty_claims || []).filter((c: any) => c.status !== "closed" && c.status !== "resolved"),
      });
    }

    // ===================== Quotations =====================
    if (method === "POST" && path === "/quotation/create") {
      const body = await req.json().catch(() => ({}));
      const customer_id = body?.customer_id || null;
      const items = Array.isArray(body?.items) ? body.items : [];
      const validUntilDays = Math.max(1, toNumber(body?.valid_until_days, 30));
      const notes = body?.notes ? String(body.notes) : null;

      if (!customer_id || items.length === 0) {
        return json({ error: "customer_id and non-empty items array are required" }, 400);
      }

      const normalizedItems = items.map((item: any) => {
        const quantity = Math.max(1, toNumber(item?.quantity, 0));
        const unitPrice = Math.max(0, toNumber(item?.unit_price, 0));
        const discountPercent = Math.max(0, toNumber(item?.discount_percent, 0));
        const gross = quantity * unitPrice;
        const discountAmount = gross * (discountPercent / 100);
        return {
          product_id: item?.product_id || null,
          quantity,
          unit_price: unitPrice,
          discount: discountPercent,
          total: Math.round((gross - discountAmount) * 100) / 100,
        };
      });

      const productIds = normalizedItems.map((item: any) => item.product_id).filter(Boolean);
      const productMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, name, sku")
          .in("id", productIds);
        if (productsError) return json({ error: productsError.message }, 500);
        (products || []).forEach((product: any) => { productMap[product.id] = product; });
      }

      const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + toNumber(item.total), 0);
      const { data: quoteNumber, error: quoteNumberError } = await supabase.rpc("generate_quote_number");
      if (quoteNumberError) return json({ error: quoteNumberError.message }, 500);

      const validUntil = addDays(new Date(), validUntilDays).toISOString();
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .insert({
          customer_id,
          quote_number: quoteNumber,
          subtotal,
          total_amount: subtotal,
          net_amount: subtotal,
          currency: "NIS",
          valid_until: validUntil,
          notes,
          status: "draft",
          version: 1,
        })
        .select("id, quote_number")
        .single();
      if (quotationError) return json({ error: quotationError.message }, 400);

      const { error: itemsError } = await supabase.from("quotation_items").insert(
        normalizedItems.map((item: any) => ({
          quotation_id: (quotation as any).id,
          product_id: item.product_id,
          description: item.product_id
            ? (productMap[item.product_id]?.name || "Product")
            : "Product",
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total: item.total,
        })),
      );
      if (itemsError) return json({ error: itemsError.message }, 400);

      return json({
        quotation_id: (quotation as any).id,
        quote_number: (quotation as any).quote_number,
      });
    }

    if (method === "GET" && path === "/quotations/pending") {
      await supabase.rpc("mark_expired_quotations");
      const { data, error } = await supabase.rpc("get_pending_quotations");
      if (error) return json({ error: error.message }, 500);
      return json(data ?? []);
    }

    if (method === "GET" && path === "/sales/search") {
      const customerId = url.searchParams.get("customer_id");
      const dateFrom = url.searchParams.get("date_from");
      const dateTo = url.searchParams.get("date_to");
      const status = url.searchParams.get("status");
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);

      let query = supabase
        .from("sales")
        .select("id, sale_number, invoice_number, sale_date, total_amount, balance_due, status, payment_status, customers(contact_person, company_name)")
        .order("sale_date", { ascending: false })
        .limit(limit);

      if (customerId) query = query.eq("customer_id", customerId);
      if (dateFrom) query = query.gte("sale_date", `${toDateString(dateFrom)}T00:00:00.000Z`);
      if (dateTo) query = query.lte("sale_date", `${toDateString(dateTo)}T23:59:59.999Z`);
      if (status) query = query.or(`status.eq.${status},payment_status.eq.${status}`);

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);

      return json({
        count: (data ?? []).length,
        items: (data ?? []).map((sale: any) => ({
          id: sale.id,
          sale_number: sale.sale_number || sale.invoice_number,
          customer_name: customerName(sale.customers),
          date: sale.sale_date,
          total_amount: toNumber(sale.total_amount),
          outstanding: toNumber(sale.balance_due),
          status: saleStatus(sale),
        })),
      });
    }

    const saleDetailMatch = path.match(new RegExp(`^/sales/${UUID}$`, "i"));
    if (method === "GET" && saleDetailMatch) {
      const saleId = saleDetailMatch[1];
      const [{ data: sale, error: saleError }, { data: items, error: itemsError }, { data: serials, error: serialsError }, { data: payments, error: paymentsError }] = await Promise.all([
        supabase
          .from("sales")
          .select("id, sale_number, invoice_number, sale_date, total_amount, balance_due, status, payment_status, notes, customers(contact_person, company_name, phone, address, email)")
          .eq("id", saleId)
          .single(),
        supabase
          .from("sale_items")
          .select("id, product_id, quantity, unit_price, total, products(name, sku, brand, product_type)")
          .eq("sale_id", saleId),
        supabase
          .from("product_serial_numbers")
          .select("product_id, serial_number")
          .eq("sale_id", saleId),
        supabase
          .from("payments")
          .select("id, payment_date, amount, nis_equivalent, payment_method, reference_number, status")
          .eq("sale_id", saleId)
          .order("payment_date", { ascending: false }),
      ]);

      if (saleError) return json({ error: saleError.message }, 404);
      if (itemsError) return json({ error: itemsError.message }, 500);
      if (serialsError) return json({ error: serialsError.message }, 500);
      if (paymentsError) return json({ error: paymentsError.message }, 500);

      return json({
        sale_id: saleId,
        sale_number: (sale as any).sale_number || (sale as any).invoice_number,
        customer: {
          name: customerName((sale as any).customers),
          company_name: (sale as any).customers?.company_name || null,
          phone: (sale as any).customers?.phone || null,
          address: (sale as any).customers?.address || null,
          email: (sale as any).customers?.email || null,
        },
        date: (sale as any).sale_date,
        outstanding_balance: toNumber((sale as any).balance_due),
        status: saleStatus(sale),
        line_items: (items ?? []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || null,
          sku: item.products?.sku || null,
          brand: item.products?.brand || null,
          product_type: item.products?.product_type || null,
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
          total: toNumber(item.total),
          serial_numbers: (serials ?? [])
            .filter((serial: any) => serial.product_id === item.product_id)
            .map((serial: any) => serial.serial_number),
        })),
        payment_history: (payments ?? []).map((payment: any) => ({
          id: payment.id,
          date: payment.payment_date,
          amount: toNumber(payment.nis_equivalent ?? payment.amount),
          method: payment.payment_method,
          reference_number: payment.reference_number,
          status: payment.status,
        })),
      });
    }

    // ===================== Checks =====================
    if (method === "GET" && path === "/checks/pending") {
      const { data, error } = await supabase.rpc("get_pending_checks");
      if (error) return json({ error: error.message }, 500);
      return json({ count: (data ?? []).length, items: data ?? [] });
    }

    const clearMatch = path.match(new RegExp(`^/checks/${UUID}/clear$`, "i"));
    if (method === "POST" && clearMatch) {
      const body = await req.json().catch(() => ({}));
      const { bank_account_id, cleared_date } = body || {};
      if (!bank_account_id) return json({ error: "bank_account_id required" }, 400);
      const { data, error } = await supabase.rpc("clear_check", {
        p_check_id: clearMatch[1],
        p_bank_account_id: bank_account_id,
        p_cleared_date: cleared_date ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    const bounceMatch = path.match(new RegExp(`^/checks/${UUID}/bounce$`, "i"));
    if (method === "POST" && bounceMatch) {
      const body = await req.json().catch(() => ({}));
      const { reason } = body || {};
      if (!reason || typeof reason !== "string") return json({ error: "reason required" }, 400);
      const { data, error } = await supabase.rpc("bounce_check", {
        p_check_id: bounceMatch[1],
        p_reason: reason,
      });
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    // ===================== Product search =====================
    if (method === "GET" && path === "/product/search") {
      const q = (url.searchParams.get("name") || "").trim();
      if (!q) return json({ error: "name query param required" }, 400);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, product_type, warranty_months, is_serialized, current_stock, standard_selling_price, brand")
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .eq("is_active", true)
        .limit(25);
      if (error) return json({ error: error.message }, 500);
      return json(
        (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          product_type: p.product_type,
          warranty_months: p.warranty_months,
          is_serialized: p.is_serialized,
          current_stock: p.current_stock,
          unit_price: p.standard_selling_price,
        })),
      );
    }

    // ===================== Warranties by customer =====================
    const warrCustMatch = path.match(new RegExp(`^/warranty/customer/${UUID}$`, "i"));
    if (method === "GET" && warrCustMatch) {
      const { data, error } = await supabase
        .from("warranties")
        .select(`
          id, serial_number, status,
          warranty_start_date, warranty_end_date,
          start_date, end_date, expiry_date,
          products(name, product_type, brand)
        `)
        .eq("customer_id", warrCustMatch[1])
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({
        count: (data ?? []).length,
        items: (data ?? []).map((w: any) => ({
          id: w.id,
          product_name: w.products?.name ?? null,
          product_type: w.products?.product_type ?? null,
          brand: w.products?.brand ?? null,
          serial_number: w.serial_number,
          start_date: w.warranty_start_date || w.start_date,
          expiry_date: w.warranty_end_date || w.end_date || w.expiry_date,
          status: w.status,
        })),
      });
    }

    // ===================== Sale create =====================
    if (method === "POST" && path === "/sale/create") {
      const body = await req.json().catch(() => ({}));
      const { customer_id, items, payment_method, notes } = body || {};
      if (!customer_id || !Array.isArray(items) || items.length === 0) {
        return json({ error: "customer_id and non-empty items required" }, 400);
      }

      // Load products to get warranty_months and validate
      const productIds = items.map((i: any) => i.product_id).filter(Boolean);
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, name, warranty_months, is_serialized, product_type")
        .in("id", productIds);
      if (prodErr) return json({ error: prodErr.message }, 500);
      const productMap: Record<string, any> = {};
      (products ?? []).forEach((p: any) => { productMap[p.id] = p; });

      // Optional serials per line — missing serials allowed (flagged on sale_items)
      for (const it of items) {
        const p = productMap[it.product_id];
        if (!p) return json({ error: `Unknown product_id ${it.product_id}` }, 400);
      }

      const subtotal = items.reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.unit_price), 0);
      const saleDate = new Date().toISOString();
      const { data: generatedSaleNumber, error: generatedSaleNumberError } = await supabase.rpc("generate_sale_number");
      if (generatedSaleNumberError) return json({ error: generatedSaleNumberError.message }, 500);

      const { data: saleRow, error: saleErr } = await supabase
        .from("sales")
        .insert({
          customer_id,
          sale_number: generatedSaleNumber,
          invoice_number: generatedSaleNumber,
          sale_date: saleDate,
          subtotal,
          subtotal_before_discount: subtotal,
          total_amount: subtotal,
          balance_due: payment_method ? 0 : subtotal,
          payment_status: payment_method ? "paid" : "pending",
          notes: notes ?? null,
        })
        .select()
        .single();
      if (saleErr) return json({ error: saleErr.message }, 400);

      const { error: itemsErr } = await supabase.from("sale_items").insert(
        items.map((it: any) => {
          const serials = Array.isArray(it.serial_numbers) ? it.serial_numbers : [];
          const filled = serials.filter((s: any) => s && String(s).trim()).length;
          const qty = Number(it.quantity) || 0;
          return {
            sale_id: saleRow.id,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total: Number(it.quantity) * Number(it.unit_price),
            has_missing_serials: filled < qty,
          };
        }),
      );
      if (itemsErr) return json({ error: itemsErr.message }, 400);

      // Link typed serials: prefer warehouse available rows, else insert as sold
      let serialNumbersRegistered = 0;
      const warrantyRows: any[] = [];
      const soldDate = saleDate.split("T")[0];
      const serialLinkErrors: string[] = [];

      for (const it of items) {
        const p = productMap[it.product_id];
        const serials = Array.isArray(it.serial_numbers) ? it.serial_numbers : [];
        for (const sn of serials) {
          const serial = String(sn || "").trim();
          if (!serial) continue;

          const { data: existing, error: lookupErr } = await supabase
            .from("product_serial_numbers")
            .select("id, status, sale_id")
            .eq("product_id", it.product_id)
            .eq("serial_number", serial)
            .maybeSingle();

          if (lookupErr) {
            serialLinkErrors.push(lookupErr.message);
            continue;
          }

          if (existing?.id && existing.status === "available") {
            const { error: updErr } = await supabase
              .from("product_serial_numbers")
              .update({
                sale_id: saleRow.id,
                status: "sold",
                sold_date: soldDate,
                customer_id,
              })
              .eq("id", existing.id)
              .eq("product_id", it.product_id);
            if (updErr) serialLinkErrors.push(updErr.message);
            else serialNumbersRegistered += 1;
          } else if (!existing) {
            const { error: insErr } = await supabase.from("product_serial_numbers").insert({
              product_id: it.product_id,
              serial_number: serial,
              customer_id,
              sale_id: saleRow.id,
              status: "sold",
              sold_date: soldDate,
              received_date: soldDate,
            });
            if (insErr) serialLinkErrors.push(insErr.message);
            else serialNumbersRegistered += 1;
          } else if (existing.sale_id === saleRow.id && existing.status === "sold") {
            serialNumbersRegistered += 1;
          } else {
            serialLinkErrors.push(`Serial ${serial} already assigned elsewhere`);
          }

          if (p?.warranty_months && Number(p.warranty_months) > 0) {
            const start = new Date(saleDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + Number(p.warranty_months));
            warrantyRows.push({
              sale_id: saleRow.id,
              product_id: it.product_id,
              customer_id,
              serial_number: serial,
              warranty_type: "manufacturer",
              warranty_period_months: Number(p.warranty_months),
              warranty_start_date: soldDate,
              warranty_end_date: end.toISOString().split("T")[0],
              start_date: soldDate,
              end_date: end.toISOString().split("T")[0],
              expiry_date: end.toISOString().split("T")[0],
              status: "active",
            });
          }
        }
      }

      if (warrantyRows.length > 0) {
        const { error } = await supabase.from("warranties").insert(warrantyRows);
        if (error) return json({ error: error.message }, 400);
      }

      return json({
        sale_id: saleRow.id,
        invoice_number: saleRow.invoice_number || saleRow.sale_number || null,
        total_amount: saleRow.total_amount,
        warranties_created: warrantyRows.length,
        serial_numbers_registered: serialNumbersRegistered,
        serial_link_warnings: serialLinkErrors.length ? serialLinkErrors : undefined,
      });
    }

    if (method === "POST" && path === "/shipment/create") {
      const body = await req.json().catch(() => ({}));
      const supplier_id = body?.supplier_id || null;
      const expected_arrival_date = body?.expected_arrival_date ? toDateString(body.expected_arrival_date) : null;
      const notes = body?.notes ? String(body.notes) : null;
      const products = Array.isArray(body?.products) ? body.products : [];

      if (!supplier_id || products.length === 0) {
        return json({ error: "supplier_id and non-empty products array are required" }, 400);
      }

      const existingIds = products.map((item: any) => item?.product_id).filter(Boolean);
      const productMap: Record<string, any> = {};
      if (existingIds.length > 0) {
        const { data: existingProducts, error: existingProductsError } = await supabase
          .from("products")
          .select("id, name")
          .in("id", existingIds);
        if (existingProductsError) return json({ error: existingProductsError.message }, 500);
        (existingProducts || []).forEach((product: any) => { productMap[product.id] = product; });
      }

      for (const item of products) {
        if (!item?.product_id && !String(item?.product_name || "").trim()) {
          return json({ error: "each product needs product_id or product_name" }, 400);
        }
        if (toNumber(item?.quantity) <= 0 || toNumber(item?.unit_price) < 0) {
          return json({ error: "each product needs quantity > 0 and unit_price >= 0" }, 400);
        }
      }

      const resolvedProducts: any[] = [];
      for (const item of products) {
        if (item?.product_id) {
          const found = productMap[item.product_id];
          if (!found) return json({ error: `Unknown product_id ${item.product_id}` }, 400);
          resolvedProducts.push(found);
          continue;
        }

        const productName = String(item.product_name).trim();
        const { data: createdProduct, error: createdProductError } = await supabase
          .from("products")
          .insert({
            name: productName,
            supplier_id,
            supplier: null,
            cost_price: toNumber(item.unit_price),
            current_stock: 0,
            reorder_point: 5,
            is_active: true,
          })
          .select("id, name")
          .single();
        if (createdProductError) return json({ error: createdProductError.message }, 400);
        resolvedProducts.push(createdProduct);
      }

      const poTotal = products.reduce((sum: number, item: any) => sum + (toNumber(item.quantity) * toNumber(item.unit_price)), 0);
      const orderDate = new Date().toISOString();
      const { data: generatedPoNumber, error: generatedPoNumberError } = await supabase.rpc("generate_po_number");
      if (generatedPoNumberError) return json({ error: generatedPoNumberError.message }, 500);

      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id,
          order_number: generatedPoNumber,
          order_date: orderDate,
          expected_delivery: expected_arrival_date,
          notes,
          currency: "USD",
          total_amount: poTotal,
          payment_status: "pending",
          purchase_type: "import",
          status: "ordered",
        })
        .select("id, order_number")
        .single();
      if (poError) return json({ error: poError.message }, 400);

      const poItemsPayload = products.map((item: any, index: number) => ({
        purchase_order_id: (po as any).id,
        product_id: resolvedProducts[index].id,
        quantity: toNumber(item.quantity),
        unit_cost: toNumber(item.unit_price),
        total: toNumber(item.quantity) * toNumber(item.unit_price),
      }));
      const { data: poItems, error: poItemsError } = await supabase
        .from("purchase_order_items")
        .insert(poItemsPayload)
        .select("id, product_id, quantity");
      if (poItemsError) return json({ error: poItemsError.message }, 400);

      const { data: shipment, error: shipmentError } = await supabase
        .from("po_shipments")
        .insert({
          purchase_order_id: (po as any).id,
          expected_arrival_date,
          shipment_date: toDateString(orderDate),
          status: "in_transit",
        })
        .select("id, shipment_number")
        .single();
      if (shipmentError) return json({ error: shipmentError.message }, 400);

      const shipmentItemsPayload = (poItems || []).map((poItem: any) => ({
        shipment_id: (shipment as any).id,
        purchase_order_item_id: poItem.id,
        product_id: poItem.product_id,
        quantity_ordered_snapshot: toNumber(poItem.quantity),
        quantity_received: 0,
      }));
      const { error: shipmentItemsError } = await supabase
        .from("po_shipment_items")
        .insert(shipmentItemsPayload);
      if (shipmentItemsError) return json({ error: shipmentItemsError.message }, 400);

      return json({
        po_id: (po as any).id,
        po_number: (po as any).order_number,
        shipment_id: (shipment as any).id,
      });
    }

    const shipmentProductMatch = path.match(new RegExp(`^/shipment/${UUID}/product$`, "i"));
    if (method === "POST" && shipmentProductMatch) {
      const shipmentId = shipmentProductMatch[1];
      const body = await req.json().catch(() => ({}));
      const product_id = body?.product_id || null;
      const quantity = Math.max(1, toNumber(body?.quantity, 0));
      const unitPrice = Math.max(0, toNumber(body?.unit_price, 0));

      if (!product_id) return json({ error: "product_id is required" }, 400);

      const { data: shipment, error: shipmentError } = await supabase
        .from("po_shipments")
        .select("id, purchase_order_id")
        .eq("id", shipmentId)
        .single();
      if (shipmentError) return json({ error: shipmentError.message }, 404);

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", product_id)
        .single();
      if (productError) return json({ error: productError.message }, 404);

      const { data: poItem, error: poItemError } = await supabase
        .from("purchase_order_items")
        .insert({
          purchase_order_id: (shipment as any).purchase_order_id,
          product_id,
          quantity,
          unit_cost: unitPrice,
          total: quantity * unitPrice,
        })
        .select("id")
        .single();
      if (poItemError) return json({ error: poItemError.message }, 400);

      const { data: shipmentItem, error: shipmentItemError } = await supabase
        .from("po_shipment_items")
        .insert({
          shipment_id: shipmentId,
          purchase_order_item_id: (poItem as any).id,
          product_id,
          quantity_ordered_snapshot: quantity,
          quantity_received: 0,
        })
        .select("id")
        .single();
      if (shipmentItemError) return json({ error: shipmentItemError.message }, 400);

      const { data: poTotals } = await supabase
        .from("purchase_order_items")
        .select("total")
        .eq("purchase_order_id", (shipment as any).purchase_order_id);
      const nextTotal = (poTotals || []).reduce((sum: number, row: any) => sum + toNumber(row.total), 0);
      await supabase
        .from("purchase_orders")
        .update({ total_amount: nextTotal })
        .eq("id", (shipment as any).purchase_order_id);

      return json({
        shipment_item_id: (shipmentItem as any).id,
        product_id: product.id,
        product_name: product.name,
      });
    }

    const shipmentPaymentMatch = path.match(new RegExp(`^/shipment/${UUID}/payment$`, "i"));
    if (method === "POST" && shipmentPaymentMatch) {
      const shipmentId = shipmentPaymentMatch[1];
      const body = await req.json().catch(() => ({}));
      const amount = toNumber(body?.amount);
      const currency = String(body?.currency || "NIS").toUpperCase();
      const paymentType = String(body?.payment_type || "other");
      const bankAccountId = body?.bank_account_id || null;
      const paymentDate = toDateString(body?.date);
      const referenceNumber = body?.reference_number ? String(body.reference_number) : null;

      if (amount <= 0) return json({ error: "amount must be greater than 0" }, 400);

      const { data: shipment, error: shipmentError } = await supabase
        .from("po_shipments")
        .select("id, purchase_order_id")
        .eq("id", shipmentId)
        .single();
      if (shipmentError) return json({ error: shipmentError.message }, 404);

      const rateToNis = await getRateToNis(supabase, currency, paymentDate);
      const nisEquivalent = Math.round(amount * rateToNis * 100) / 100;

      const { data, error } = await supabase
        .from("po_payments_out")
        .insert({
          purchase_order_id: (shipment as any).purchase_order_id,
          shipment_id: shipmentId,
          amount,
          original_currency: currency,
          exchange_rate_to_nis: rateToNis,
          nis_equivalent: nisEquivalent,
          payment_date: paymentDate,
          payment_method: bankAccountId ? "bank_transfer" : "cash",
          payment_type: paymentType,
          cost_category: paymentTypeToCostCategory(paymentType),
          bank_account_id: bankAccountId,
          notes: referenceNumber ? `Ref: ${referenceNumber}` : null,
          method_details: referenceNumber ? { reference_number: referenceNumber } : null,
        })
        .select("id, nis_equivalent")
        .single();
      if (error) return json({ error: error.message }, 400);

      return json({
        payment_id: (data as any).id,
        amount_nis: (data as any).nis_equivalent,
      });
    }

    const shipmentDetailMatch = path.match(new RegExp(`^/shipment/${UUID}$`, "i"));
    if (method === "GET" && shipmentDetailMatch) {
      const shipmentId = shipmentDetailMatch[1];
      const [{ data: shipment, error: shipmentError }, { data: products, error: productsError }, { data: payments, error: paymentsError }] = await Promise.all([
        supabase
          .from("po_shipments")
          .select("id, shipment_number, status, shipment_date, expected_arrival_date, warehouse_arrival_date, purchase_order_id, purchase_orders(id, order_number, supplier_id, total_amount, currency, notes, status, suppliers(name))")
          .eq("id", shipmentId)
          .single(),
        supabase
          .from("po_shipment_items")
          .select("id, quantity_ordered_snapshot, quantity_received, variance, product_id, purchase_order_item_id, products(name, sku), purchase_order_items(unit_cost, total)")
          .eq("shipment_id", shipmentId),
        supabase
          .from("po_payments_out")
          .select("id, amount, original_currency, nis_equivalent, payment_date, payment_type, payment_method, notes, bank_account_id")
          .eq("shipment_id", shipmentId)
          .order("payment_date", { ascending: false }),
      ]);

      if (shipmentError) return json({ error: shipmentError.message }, 404);
      if (productsError) return json({ error: productsError.message }, 500);
      if (paymentsError) return json({ error: paymentsError.message }, 500);

      const productItems = (products ?? []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || null,
        sku: item.products?.sku || null,
        quantity: toNumber(item.quantity_ordered_snapshot),
        quantity_received: toNumber(item.quantity_received),
        unit_price: toNumber(item.purchase_order_items?.unit_cost),
        total: toNumber(item.purchase_order_items?.total),
        variance: toNumber(item.variance),
      }));

      const paymentItems = (payments ?? []).map((payment: any) => ({
        id: payment.id,
        amount: toNumber(payment.amount),
        currency: payment.original_currency,
        amount_nis: toNumber(payment.nis_equivalent),
        date: payment.payment_date,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        notes: payment.notes,
        bank_account_id: payment.bank_account_id,
      }));

      const poTotal = toNumber((shipment as any).purchase_orders?.total_amount);
      const poCurrency = (shipment as any).purchase_orders?.currency || "NIS";
      const poRateToNis = await getRateToNis(supabase, poCurrency, (shipment as any).shipment_date);
      const poTotalNis = Math.round(poTotal * poRateToNis * 100) / 100;
      const totalPaid = paymentItems.reduce((sum: number, payment: any) => sum + toNumber(payment.amount_nis), 0);

      return json({
        shipment_id: shipmentId,
        shipment_number: (shipment as any).shipment_number,
        current_stage: (shipment as any).status,
        expected_arrival: (shipment as any).expected_arrival_date,
        purchase_order: {
          po_id: (shipment as any).purchase_orders?.id,
          po_number: (shipment as any).purchase_orders?.order_number,
          supplier_id: (shipment as any).purchase_orders?.supplier_id,
          supplier_name: (shipment as any).purchase_orders?.suppliers?.name || null,
          status: (shipment as any).purchase_orders?.status || null,
          currency: (shipment as any).purchase_orders?.currency || null,
          total_amount: poTotal,
          total_amount_nis: poTotalNis,
          notes: (shipment as any).purchase_orders?.notes || null,
        },
        products: productItems,
        payments: paymentItems,
        total_paid: totalPaid,
        total_outstanding: Math.max(0, poTotalNis - totalPaid),
      });
    }

    return json({ error: "Not found", path, method }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
