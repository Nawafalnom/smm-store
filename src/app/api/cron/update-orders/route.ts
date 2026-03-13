import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Secret key to protect the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET || "growence-cron-2024";

// Status mapping from provider to our system
const STATUS_MAP: Record<string, string> = {
  "Pending": "pending",
  "Processing": "processing",
  "In progress": "in_progress",
  "Completed": "completed",
  "Cancelled": "cancelled",
  "Canceled": "cancelled",
  "Partial": "partial",
  "Error": "cancelled",
};

// Call provider API directly (server-side)
async function callProvider(apiUrl: string, apiKey: string, params: Record<string, string>) {
  try {
    const body = new URLSearchParams({ key: apiKey, ...params });
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    return await res.json();
  } catch (err) {
    console.error(`Provider API error (${apiUrl}):`, err);
    return null;
  }
}

// GET handler — Vercel Cron uses GET
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends it as Authorization header)
  const authHeader = req.headers.get("authorization");
  const urlSecret = req.nextUrl.searchParams.get("secret");

  if (authHeader !== `Bearer ${CRON_SECRET}` && urlSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const log: string[] = [];

  try {
    // 1. Fetch all active orders that need status check
    const { data: pendingOrders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, api_order_id, status, user_id, price, quantity, start_count, remains, service:services(provider_id)")
      .in("status", ["pending", "processing", "in_progress"])
      .neq("api_order_id", "")
      .limit(200);

    if (fetchErr) {
      log.push(`DB Error: ${fetchErr.message}`);
      return NextResponse.json({ success: false, log, error: fetchErr.message });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ success: true, message: "No pending orders", updated: 0 });
    }

    log.push(`Found ${pendingOrders.length} pending orders`);

    // 2. Group orders by provider
    const byProvider: Record<string, { providerId: string; orders: any[] }> = {};
    for (const o of pendingOrders) {
      const pid = (o as any).service?.provider_id;
      if (!pid || !o.api_order_id) continue;
      if (!byProvider[pid]) byProvider[pid] = { providerId: pid, orders: [] };
      byProvider[pid].orders.push(o);
    }

    // 3. Fetch provider details
    const providerIds = Object.keys(byProvider);
    const { data: providers } = await supabase
      .from("providers")
      .select("id, name, api_url, api_key, is_active")
      .in("id", providerIds)
      .eq("is_active", true);

    if (!providers || providers.length === 0) {
      return NextResponse.json({ success: true, message: "No active providers", updated: 0 });
    }

    let totalUpdated = 0;
    let totalErrors = 0;

    // 4. For each provider, check order statuses
    for (const provider of providers) {
      const group = byProvider[provider.id];
      if (!group) continue;

      log.push(`Provider: ${provider.name} — ${group.orders.length} orders`);

      // Try multi-order status first (more efficient)
      const orderIds = group.orders.map((o: any) => o.api_order_id);

      // Some providers support multi-order, some don't — try both
      let multiResult: any = null;
      let useMulti = false;

      if (orderIds.length > 1) {
        multiResult = await callProvider(provider.api_url, provider.api_key, {
          action: "status",
          orders: orderIds.join(","),
        });
        // Check if multi-result is a valid object with order IDs as keys
        if (multiResult && typeof multiResult === "object" && !multiResult.error && !Array.isArray(multiResult)) {
          useMulti = true;
        }
      }

      // Process each order
      for (const order of group.orders) {
        try {
          let statusData: any = null;

          if (useMulti && multiResult) {
            // Use multi-result
            statusData = multiResult[order.api_order_id];
          }

          // If multi didn't work, try single order status
          if (!statusData || statusData.error) {
            statusData = await callProvider(provider.api_url, provider.api_key, {
              action: "status",
              order: order.api_order_id,
            });
          }

          if (!statusData || statusData.error) {
            log.push(`  Order ${order.api_order_id}: API error — ${statusData?.error || "no response"}`);
            totalErrors++;
            continue;
          }

          // Map status
          const newStatus = STATUS_MAP[statusData.status] || order.status;
          const startCount = Number(statusData.start_count) || order.start_count || 0;
          const remains = Number(statusData.remains) || 0;

          // Only update if something changed
          if (newStatus !== order.status || startCount !== order.start_count || remains !== order.remains) {
            const updateData: any = {
              status: newStatus,
              start_count: startCount,
              remains: remains,
            };

            await supabase.from("orders").update(updateData).eq("id", order.id);

            // Handle refunds for partial/cancelled orders
            if (newStatus === "partial" && order.status !== "partial" && remains > 0) {
              const refund = (order.price / order.quantity) * remains;
              if (refund > 0) {
                const { data: profile } = await supabase.from("profiles").select("balance, total_spent").eq("id", order.user_id).single();
                if (profile) {
                  await supabase.from("profiles").update({
                    balance: profile.balance + refund,
                    total_spent: Math.max(0, profile.total_spent - refund),
                  }).eq("id", order.user_id);
                  log.push(`  Order ${order.api_order_id}: PARTIAL — refund $${refund.toFixed(4)}`);
                }
              }
            }

            if (newStatus === "cancelled" && order.status !== "cancelled") {
              const { data: profile } = await supabase.from("profiles").select("balance, total_spent").eq("id", order.user_id).single();
              if (profile) {
                await supabase.from("profiles").update({
                  balance: profile.balance + order.price,
                  total_spent: Math.max(0, profile.total_spent - order.price),
                }).eq("id", order.user_id);
                log.push(`  Order ${order.api_order_id}: CANCELLED — refund $${order.price.toFixed(4)}`);
              }
            }

            totalUpdated++;
            log.push(`  Order ${order.api_order_id}: ${order.status} → ${newStatus} | start: ${startCount} | remains: ${remains}`);
          }
        } catch (err: any) {
          log.push(`  Order ${order.api_order_id}: Error — ${err.message}`);
          totalErrors++;
        }
      }
    }

    const elapsed = Date.now() - startTime;
    log.push(`Done in ${elapsed}ms — ${totalUpdated} updated, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      updated: totalUpdated,
      errors: totalErrors,
      total: pendingOrders.length,
      elapsed: `${elapsed}ms`,
      log,
    });

  } catch (err: any) {
    log.push(`Fatal error: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message, log }, { status: 500 });
  }
}

// POST handler — for manual trigger from admin
export async function POST(req: NextRequest) {
  // Reuse GET logic but verify admin session instead
  const sessionCookie = req.cookies.get("gm_admin_session");
  const body = await req.json().catch(() => ({}));

  if (!sessionCookie?.value && body.secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to GET handler logic
  const url = new URL(req.url);
  url.searchParams.set("secret", CRON_SECRET);
  const getReq = new NextRequest(url, { method: "GET" });
  return GET(getReq);
}
