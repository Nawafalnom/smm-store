import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { queryBinanceOrder } from "@/lib/binance-pay";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { deposit_id } = await req.json();
    if (!deposit_id) return NextResponse.json({ error: "deposit_id required" }, { status: 400 });

    // Get deposit
    const { data: deposit } = await supabase.from("deposits").select("*").eq("id", deposit_id).single();
    if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    if (deposit.status === "approved") return NextResponse.json({ success: true, status: "approved", message: "تم الشحن بالفعل" });

    const prepayId = deposit.transaction_id;
    if (!prepayId) return NextResponse.json({ error: "No prepayId" }, { status: 400 });

    // Query Binance
    const result = await queryBinanceOrder(prepayId);
    if (!result.success) return NextResponse.json({ success: false, status: deposit.status, error: result.error });

    if (result.status === "PAID") {
      // Auto-approve
      await supabase.from("deposits").update({
        status: "approved",
        transaction_id: result.transactionId || prepayId,
        admin_note: "تأكيد تلقائي (فحص يدوي)",
        updated_at: new Date().toISOString(),
      }).eq("id", deposit.id);

      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", deposit.user_id).single();
      if (profile) {
        await supabase.from("profiles").update({ balance: profile.balance + deposit.amount }).eq("id", deposit.user_id);
      }

      return NextResponse.json({ success: true, status: "approved", message: `تم شحن $${deposit.amount} بنجاح ✓` });
    }

    return NextResponse.json({
      success: true,
      status: result.status?.toLowerCase() || deposit.status,
      binanceStatus: result.status,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
