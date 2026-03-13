import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

// ─── Helper: get provider and call its API ───
async function getProvider(providerId: string) {
  const { data } = await supabase.from("providers").select("*").eq("id", providerId).single();
  return data;
}

async function callProviderApi(apiUrl: string, apiKey: string, params: Record<string, string>) {
  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return res.json();
}

// ─── Log API usage ───
async function logApiCall(userId: string, action: string, request: any, response: any, ip: string) {
  await supabase.from("api_orders_log").insert({
    user_id: userId,
    action,
    request_data: request,
    response_data: response,
    ip_address: ip,
  }).then(() => {}, () => {});
}

// ─── Authenticate by API key ───
async function authenticateUser(key: string) {
  if (!key) return null;
  const { data } = await supabase.from("profiles").select("*").eq("api_key", key).eq("api_enabled", true).single();
  return data;
}

// ═══════════════════════════════════════
//  POST /api/v2 — Standard SMM Panel API
// ═══════════════════════════════════════
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  try {
    // Support both JSON and form-urlencoded
    let params: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await req.json();
      Object.keys(json).forEach(k => { params[k] = String(json[k]); });
    } else {
      const formData = await req.text();
      const urlParams = new URLSearchParams(formData);
      urlParams.forEach((v, k) => { params[k] = v; });
    }

    const { key, action, ...rest } = params;

    // ── Auth ──
    if (!key) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const user = await authenticateUser(key);
    if (!user) {
      return NextResponse.json({ error: "Invalid API key or API access disabled" }, { status: 401 });
    }

    if (!action) {
      return NextResponse.json({ error: "Action required. Available: services, balance, add, status, refill, cancel" }, { status: 400 });
    }

    let result: any;

    switch (action) {
      // ═══════════════════════════
      //  services — List all active services
      // ═══════════════════════════
      case "services": {
        const { data: services } = await supabase
          .from("services")
          .select("id, name, category:categories(name), price_per_1000, min_quantity, max_quantity, can_refill, can_cancel, description, api_service_id")
          .eq("is_active", true)
          .order("sort_order");

        result = (services || []).map((s: any) => ({
          service: s.api_service_id,
          name: s.name,
          type: "Default",
          category: s.category?.name || "عام",
          rate: String(s.price_per_1000),
          min: String(s.min_quantity),
          max: String(s.max_quantity),
          refill: s.can_refill || false,
          cancel: s.can_cancel || false,
          description: s.description || "",
        }));

        await logApiCall(user.id, "services", {}, { count: result.length }, ip);
        return NextResponse.json(result);
      }

      // ═══════════════════════════
      //  balance — User balance
      // ═══════════════════════════
      case "balance": {
        result = { balance: String(user.balance || 0), currency: "USD" };
        await logApiCall(user.id, "balance", {}, result, ip);
        return NextResponse.json(result);
      }

      // ═══════════════════════════
      //  add — Place new order
      // ═══════════════════════════
      case "add": {
        const { service: serviceId, link, quantity, comments, runs, interval } = rest;

        if (!serviceId || !link || !quantity) {
          return NextResponse.json({ error: "Parameters required: service, link, quantity" }, { status: 400 });
        }

        const qty = Number(quantity);
        if (isNaN(qty) || qty < 1) {
          return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
        }

        // Find service by api_service_id
        const { data: svc } = await supabase
          .from("services")
          .select("*, provider:providers(*)")
          .eq("api_service_id", Number(serviceId))
          .eq("is_active", true)
          .single();

        if (!svc) {
          return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
        }

        // Validate quantity
        if (qty < svc.min_quantity || qty > svc.max_quantity) {
          return NextResponse.json({ error: `Quantity must be between ${svc.min_quantity} and ${svc.max_quantity}` }, { status: 400 });
        }

        // Calculate price with user discount
        const basePrice = (svc.price_per_1000 / 1000) * qty;
        const discount = user.discount || 0;
        const price = Math.round((basePrice * (1 - discount / 100)) * 10000) / 10000;

        // Check balance
        if (user.balance < price) {
          return NextResponse.json({ error: `Insufficient balance. Required: $${price.toFixed(4)}, Available: $${user.balance.toFixed(4)}` }, { status: 400 });
        }

        // Place order with provider
        const provider = svc.provider;
        if (!provider || !provider.is_active) {
          return NextResponse.json({ error: "Provider unavailable" }, { status: 503 });
        }

        const orderParams: Record<string, string> = {
          action: "add",
          service: String(svc.api_service_id),
          link,
          quantity: String(qty),
        };
        if (comments) orderParams.comments = comments;
        if (runs) orderParams.runs = runs;
        if (interval) orderParams.interval = interval;

        const apiResult = await callProviderApi(provider.api_url, provider.api_key, orderParams);

        if (apiResult.error) {
          await logApiCall(user.id, "add", { service: serviceId, link, quantity }, { error: apiResult.error }, ip);
          return NextResponse.json({ error: apiResult.error }, { status: 400 });
        }

        // Deduct balance
        await supabase.from("profiles").update({
          balance: user.balance - price,
          total_spent: (user.total_spent || 0) + price,
        }).eq("id", user.id);

        // Create order record
        const { data: order } = await supabase.from("orders").insert({
          user_id: user.id,
          service_id: svc.id,
          api_order_id: String(apiResult.order || ""),
          link,
          quantity: qty,
          price,
          status: "pending",
          start_count: 0,
          remains: qty,
        }).select("order_number").single();

        result = { order: order?.order_number || apiResult.order };
        await logApiCall(user.id, "add", { service: serviceId, link, quantity, price }, result, ip);
        return NextResponse.json(result);
      }

      // ═══════════════════════════
      //  status — Check order status
      // ═══════════════════════════
      case "status": {
        const { order: orderId, orders: orderIds } = rest;

        if (orderIds) {
          // Multi-order status by order_number
          const nums = orderIds.split(",").map((n: string) => n.trim());
          const { data: dbOrders } = await supabase
            .from("orders")
            .select("order_number, status, start_count, remains, quantity, price, api_order_id, link, created_at")
            .eq("user_id", user.id)
            .in("order_number", nums.map(Number));

          result = {};
          for (const o of (dbOrders || [])) {
            result[String(o.order_number)] = {
              charge: String(o.price),
              start_count: String(o.start_count),
              status: capitalizeStatus(o.status),
              remains: String(o.remains),
              currency: "USD",
            };
          }
          await logApiCall(user.id, "status", { orders: orderIds }, { count: Object.keys(result).length }, ip);
          return NextResponse.json(result);
        }

        if (orderId) {
          // Single order status
          const { data: dbOrder } = await supabase
            .from("orders")
            .select("order_number, status, start_count, remains, quantity, price, link, created_at")
            .eq("user_id", user.id)
            .eq("order_number", Number(orderId))
            .single();

          if (!dbOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
          }

          result = {
            charge: String(dbOrder.price),
            start_count: String(dbOrder.start_count),
            status: capitalizeStatus(dbOrder.status),
            remains: String(dbOrder.remains),
            currency: "USD",
          };
          await logApiCall(user.id, "status", { order: orderId }, result, ip);
          return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Parameter required: order (single) or orders (comma-separated)" }, { status: 400 });
      }

      // ═══════════════════════════
      //  refill — Request refill
      // ═══════════════════════════
      case "refill": {
        const { order: orderId } = rest;
        if (!orderId) {
          return NextResponse.json({ error: "Parameter required: order" }, { status: 400 });
        }

        const { data: dbOrder } = await supabase
          .from("orders")
          .select("*, service:services(*, provider:providers(*))")
          .eq("user_id", user.id)
          .eq("order_number", Number(orderId))
          .single();

        if (!dbOrder) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const svc = (dbOrder as any).service;
        if (!svc?.can_refill) {
          return NextResponse.json({ error: "This service does not support refill" }, { status: 400 });
        }

        const provider = svc.provider;
        if (!provider) {
          return NextResponse.json({ error: "Provider unavailable" }, { status: 503 });
        }

        const refillResult = await callProviderApi(provider.api_url, provider.api_key, {
          action: "refill",
          order: dbOrder.api_order_id,
        });

        result = refillResult;
        await logApiCall(user.id, "refill", { order: orderId }, result, ip);
        return NextResponse.json(result);
      }

      // ═══════════════════════════
      //  cancel — Cancel order
      // ═══════════════════════════
      case "cancel": {
        const { order: orderId, orders: orderIds } = rest;
        const orderNumStr = orderId || orderIds;
        if (!orderNumStr) {
          return NextResponse.json({ error: "Parameter required: order or orders" }, { status: 400 });
        }

        const nums = orderNumStr.split(",").map((n: string) => n.trim());
        const { data: dbOrders } = await supabase
          .from("orders")
          .select("*, service:services(*, provider:providers(*))")
          .eq("user_id", user.id)
          .in("order_number", nums.map(Number));

        if (!dbOrders || dbOrders.length === 0) {
          return NextResponse.json({ error: "Orders not found" }, { status: 404 });
        }

        const results: any[] = [];
        for (const o of dbOrders) {
          const svc = (o as any).service;
          if (!svc?.can_cancel || !["pending", "processing", "in_progress"].includes(o.status)) {
            results.push({ order: (o as any).order_number, error: "Cannot cancel" });
            continue;
          }
          const provider = svc.provider;
          if (!provider) {
            results.push({ order: (o as any).order_number, error: "Provider unavailable" });
            continue;
          }

          const cancelResult = await callProviderApi(provider.api_url, provider.api_key, {
            action: "cancel",
            orders: o.api_order_id,
          });

          results.push({ order: (o as any).order_number, cancel: cancelResult });
        }

        result = results.length === 1 ? results[0] : results;
        await logApiCall(user.id, "cancel", { orders: orderNumStr }, result, ip);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}. Available: services, balance, add, status, refill, cancel` }, { status: 400 });
    }

  } catch (err: any) {
    console.error("API v2 Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// Also support GET for convenience (some panels use GET)
export async function GET(req: NextRequest) {
  // Convert query params to POST-like request
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  // Create a mock request with the params
  const mockReq = new NextRequest(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });

  return POST(mockReq);
}

// Helper: capitalize status for standard API format
function capitalizeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    partial: "Partial",
  };
  return map[status] || status;
}
