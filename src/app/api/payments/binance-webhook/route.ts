import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BINANCE_SECRET_KEY = process.env.BINANCE_PAY_SECRET_KEY || "";

function verifySignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  const expected = crypto.createHmac("sha512", BINANCE_SECRET_KEY).update(payload).digest("hex").toUpperCase();
  return expected === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("BinancePay-Timestamp") || "";
    const nonce = req.headers.get("BinancePay-Nonce") || "";
    const signature = req.headers.get("BinancePay-Signature") || "";

    // Verify signature
    if (BINANCE_SECRET_KEY && signature) {
      const valid = verifySignature(timestamp, nonce, rawBody, signature);
      if (!valid) {
        console.error("Binance webhook: Invalid signature");
        return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid signature" });
      }
    }

    const data = JSON.parse(rawBody);
    console.log("Binance webhook received:", JSON.stringify(data));

    // Binance sends: { bizType, data, bizId, bizStatus }
    // bizType: "PAY" for payment
    // bizStatus: "PAY_SUCCESS" when payment is complete
    if (data.bizType === "PAY" && data.bizStatus === "PAY_SUCCESS") {
      const paymentData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
      const merchantTradeNo = paymentData?.merchantTradeNo || "";
      const totalFee = Number(paymentData?.totalFee || paymentData?.orderAmount || 0);
      const transactionId = paymentData?.transactionId || "";

      if (!merchantTradeNo) {
        console.error("Binance webhook: No merchantTradeNo");
        return NextResponse.json({ returnCode: "FAIL", returnMessage: "No trade number" });
      }

      // Find the deposit by transaction_id (which we set as merchantTradeNo)
      const { data: deposit, error: findErr } = await supabase
        .from("deposits")
        .select("*")
        .eq("transaction_id", merchantTradeNo)
        .eq("method", "binance_pay")
        .single();

      if (findErr || !deposit) {
        console.error("Binance webhook: Deposit not found for", merchantTradeNo);
        return NextResponse.json({ returnCode: "FAIL", returnMessage: "Deposit not found" });
      }

      // Already processed?
      if (deposit.status === "approved") {
        console.log("Binance webhook: Already processed", merchantTradeNo);
        return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "Already processed" });
      }

      // Update deposit as approved
      await supabase.from("deposits").update({
        status: "approved",
        admin_note: `Auto-approved | Binance TX: ${transactionId} | Paid: ${totalFee} USDT`,
        updated_at: new Date().toISOString(),
      }).eq("id", deposit.id);

      // Add balance to user
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", deposit.user_id)
        .single();

      if (profile) {
        const newBalance = (profile.balance || 0) + deposit.amount;
        await supabase.from("profiles").update({
          balance: newBalance,
        }).eq("id", deposit.user_id);

        console.log(`Binance webhook: Added $${deposit.amount} to user ${deposit.user_id}. New balance: $${newBalance}`);
      }

      // Create notification for admin
      await supabase.from("admin_notifications").insert({
        type: "new_deposit",
        title: "شحن تلقائي ✓",
        message: `تم شحن $${deposit.amount} تلقائياً عبر Binance Pay | TX: ${transactionId}`,
        metadata: { deposit_id: deposit.id, user_id: deposit.user_id, amount: deposit.amount },
      }).then(() => {}, () => {});

      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
    }

    // For other events (REFUND, etc.)
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "Event received" });

  } catch (err: any) {
    console.error("Binance webhook error:", err);
    return NextResponse.json({ returnCode: "FAIL", returnMessage: err.message });
  }
}

// Binance may also send GET to verify endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "binance-pay-webhook" });
}
