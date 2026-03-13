import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createBinanceOrder } from "@/lib/binance-pay";

// Run in Singapore to avoid Binance geo-restrictions on US servers
export const preferredRegion = "sin1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount } = await req.json();

    if (!user_id || !amount || Number(amount) < 1) {
      return NextResponse.json({ error: "طلب غير صالح — user_id و amount مطلوبين" }, { status: 400 });
    }

    // Check env vars
    if (!process.env.BINANCE_PAY_API_KEY || !process.env.BINANCE_PAY_SECRET_KEY) {
      console.error("Binance Pay ENV MISSING: BINANCE_PAY_API_KEY or BINANCE_PAY_SECRET_KEY not set");
      return NextResponse.json({ error: "Binance Pay غير مُعدّ — تواصل مع الإدارة (ENV missing)" }, { status: 500 });
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
      console.error("DB Error creating deposit:", dbErr);
      return NextResponse.json({ error: `خطأ في قاعدة البيانات: ${dbErr?.message || "unknown"}` }, { status: 500 });
    }

    // 2. Create Binance Pay order
    const origin = req.headers.get("origin") || "https://smm-store-five.vercel.app";
    console.log("Creating Binance order:", { amount: amt, depositId: deposit.id, origin });

    const result = await createBinanceOrder({
      amount: amt,
      depositId: deposit.id,
      userId: user_id,
      returnUrl: `${origin}/dashboard?deposit=success`,
      webhookUrl: `${origin}/api/payments/binance/webhook`,
    });

    console.log("Binance API result:", JSON.stringify(result));

    if (!result.success || !result.checkoutUrl) {
      // Update deposit as failed
      await supabase.from("deposits").update({ status: "expired", admin_note: result.error || "Failed to create order" }).eq("id", deposit.id);
      return NextResponse.json({ error: `Binance Pay: ${result.error || "فشل إنشاء الطلب"}` }, { status: 500 });
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
    return NextResponse.json({ error: `خطأ: ${err.message || "Unknown"}` }, { status: 500 });
  }
}
