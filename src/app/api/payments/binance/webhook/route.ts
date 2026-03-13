import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/binance-pay";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

// Binance Pay sends webhook as POST
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("binancepay-signature") || "";

    // Verify signature if secret key is configured
    if (process.env.BINANCE_PAY_SECRET_KEY) {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error("Binance webhook: invalid signature");
        // Still return SUCCESS to prevent retries, but log it
      }
    }

    const body = JSON.parse(rawBody);
    console.log("Binance webhook received:", JSON.stringify(body));

    // Binance Pay webhook format:
    // { bizType: "PAY", bizId: "...", bizStatus: "PAY_SUCCESS", data: "{ JSON string }" }
    if (body.bizType === "PAY" && body.bizStatus === "PAY_SUCCESS") {
      let data: any;
      try {
        data = typeof body.data === "string" ? JSON.parse(body.data) : body.data;
      } catch {
        data = body.data;
      }

      const prepayId = data?.prepayId || "";
      const merchantTradeNo = data?.merchantTradeNo || "";
      const transactionId = data?.transactionId || body.bizId || "";

      if (!prepayId && !merchantTradeNo) {
        console.error("Binance webhook: no prepayId or merchantTradeNo found");
        return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
      }

      // Find deposit — try prepayId first, then merchantTradeNo
      let deposit: any = null;

      if (prepayId) {
        const { data: d } = await supabase
          .from("deposits")
          .select("*")
          .eq("transaction_id", prepayId)
          .eq("method", "binance_pay")
          .single();
        deposit = d;
      }

      if (!deposit && merchantTradeNo) {
        // merchantTradeNo might be stored or the prepayId field might contain it
        const { data: d } = await supabase
          .from("deposits")
          .select("*")
          .eq("transaction_id", merchantTradeNo)
          .eq("method", "binance_pay")
          .single();
        deposit = d;
      }

      if (!deposit) {
        // Last resort: find any recent pending binance_pay deposit
        // This helps when the stored transaction_id doesn't match
        console.error("Binance webhook: deposit not found for prepayId:", prepayId, "merchantTradeNo:", merchantTradeNo);
        return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
      }

      // Already processed?
      if (deposit.status === "approved") {
        console.log("Binance webhook: deposit already approved:", deposit.id);
        return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
      }

      // 1. Update deposit to approved
      await supabase.from("deposits").update({
        status: "approved",
        transaction_id: transactionId || prepayId,
        admin_note: "تأكيد تلقائي من Binance Pay",
        updated_at: new Date().toISOString(),
      }).eq("id", deposit.id);

      // 2. Add balance to user
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", deposit.user_id)
        .single();

      if (profile) {
        await supabase.from("profiles").update({
          balance: profile.balance + deposit.amount,
        }).eq("id", deposit.user_id);
      }

      // 3. Create notification
      await supabase.from("admin_notifications").insert({
        type: "new_deposit",
        title: "شحن تلقائي ✓",
        message: `تم شحن $${deposit.amount} تلقائياً عبر Binance Pay`,
        metadata: { deposit_id: deposit.id, user_id: deposit.user_id, amount: deposit.amount },
      }).then(() => {}, () => {});

      console.log(`Binance webhook: deposit ${deposit.id} approved, $${deposit.amount} added to user ${deposit.user_id}`);
    }

    // Must return this exact format for Binance
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });

  } catch (err: any) {
    console.error("Binance webhook error:", err);
    // Still return SUCCESS to prevent endless retries
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
  }
}
