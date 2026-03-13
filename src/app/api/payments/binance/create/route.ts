import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createBinanceOrder } from "@/lib/binance-pay";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount } = await req.json();

    if (!user_id || !amount || Number(amount) < 1) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const amt = Number(amount);

    // 1. Create deposit record with status "pending"
    const { data: deposit, error: dbErr } = await supabase.from("deposits").insert({
      user_id,
      amount: amt,
      method: "binance_pay",
      status: "pending",
      transaction_id: "",
    }).select().single();

    if (dbErr || !deposit) {
      return NextResponse.json({ error: dbErr?.message || "DB error" }, { status: 500 });
    }

    // 2. Create Binance Pay order
    const origin = req.headers.get("origin") || "https://smm-store-five.vercel.app";
    const result = await createBinanceOrder({
      amount: amt,
      depositId: deposit.id,
      userId: user_id,
      returnUrl: `${origin}/dashboard?deposit=success`,
      webhookUrl: `${origin}/api/payments/binance/webhook`,
    });

    if (!result.success || !result.checkoutUrl) {
      // Update deposit as failed
      await supabase.from("deposits").update({ status: "expired", admin_note: result.error || "Failed to create order" }).eq("id", deposit.id);
      return NextResponse.json({ error: result.error || "Failed to create Binance Pay order" }, { status: 500 });
    }

    // 3. Save prepayId for tracking
    await supabase.from("deposits").update({
      transaction_id: result.prepayId || "",
    }).eq("id", deposit.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      depositId: deposit.id,
      prepayId: result.prepayId,
    });

  } catch (err: any) {
    console.error("Create payment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
