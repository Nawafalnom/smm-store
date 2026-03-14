import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function callProviderApi(apiUrl: string, apiKey: string, params: Record<string, string>) {
  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, service_id, link, quantity } = await req.json();

    if (!user_id || !service_id || !link || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // 1. Get service + provider (server-side)
    const { data: svc } = await supabase
      .from("services")
      .select("*, provider:providers(*)")
      .eq("id", service_id)
      .eq("is_active", true)
      .single();

    if (!svc) {
      return NextResponse.json({ error: "خدمة غير موجودة أو غير متاحة" }, { status: 404 });
    }

    // 2. Validate quantity
    if (qty < svc.min_quantity || qty > svc.max_quantity) {
      return NextResponse.json({ error: `الكمية: ${svc.min_quantity} - ${svc.max_quantity}` }, { status: 400 });
    }

    // 3. Calculate price server-side
    const price = Math.round(((svc.price_per_1000 / 1000) * qty) * 10000) / 10000;

    // 4. Get profile and check balance (server-side)
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance, total_spent, discount")
      .eq("id", user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
    }

    // Apply discount
    const finalPrice = Math.round((price * (1 - (profile.discount || 0) / 100)) * 10000) / 10000;

    if (profile.balance < finalPrice) {
      return NextResponse.json({ error: `رصيدك غير كافٍ. المطلوب: $${finalPrice.toFixed(4)} — المتاح: $${profile.balance.toFixed(4)}` }, { status: 400 });
    }

    // 5. Check provider
    const provider = svc.provider;
    if (!provider || !provider.is_active) {
      return NextResponse.json({ error: "المزوّد غير متاح حالياً" }, { status: 503 });
    }

    // 6. Place order with provider
    const orderParams: Record<string, string> = {
      action: "add",
      service: String(svc.api_service_id),
      link,
      quantity: String(qty),
    };

    const apiResult = await callProviderApi(provider.api_url, provider.api_key, orderParams);

    if (apiResult.error) {
      return NextResponse.json({ error: `خطأ من المزوّد: ${apiResult.error}` }, { status: 400 });
    }

    // 7. Deduct balance ATOMICALLY (server-side, not client)
    const { error: balanceErr } = await supabase.rpc('deduct_balance', {
      p_user_id: user_id,
      p_amount: finalPrice,
    }).then(r => r, () => ({ error: { message: "RPC not found" } }));

    // Fallback if RPC doesn't exist
    if (balanceErr) {
      await supabase.from("profiles").update({
        balance: profile.balance - finalPrice,
        total_spent: (profile.total_spent || 0) + finalPrice,
      }).eq("id", user_id);
    }

    // 8. Create order record
    const { data: order } = await supabase.from("orders").insert({
      user_id,
      service_id: svc.id,
      api_order_id: String(apiResult.order || ""),
      link,
      quantity: qty,
      price: finalPrice,
      status: "pending",
      start_count: 0,
      remains: qty,
    }).select("order_number").single();

    return NextResponse.json({
      success: true,
      order: order?.order_number || apiResult.order,
      price: finalPrice,
    });

  } catch (err: any) {
    console.error("Order API error:", err);
    return NextResponse.json({ error: err.message || "خطأ في الخادم" }, { status: 500 });
  }
}
