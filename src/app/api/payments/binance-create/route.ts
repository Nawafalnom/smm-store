import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BINANCE_API_KEY = process.env.BINANCE_PAY_API_KEY || "";
const BINANCE_SECRET_KEY = process.env.BINANCE_PAY_SECRET_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://smm-store-five.vercel.app";

function generateNonce(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function signPayload(timestamp: string, nonce: string, body: string): string {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  return crypto.createHmac("sha512", BINANCE_SECRET_KEY).update(payload).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount } = await req.json();

    if (!user_id || !amount || Number(amount) < 1) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
      return NextResponse.json({ error: "Binance Pay not configured" }, { status: 500 });
    }

    // Verify user exists
    const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", user_id).single();
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create unique merchant trade number
    const tradeNo = `GM${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Create deposit record first (pending)
    const { data: deposit, error: depErr } = await supabase.from("deposits").insert({
      user_id,
      amount: Number(amount),
      method: "binance_pay",
      status: "pending",
      transaction_id: tradeNo,
    }).select("id").single();

    if (depErr) {
      return NextResponse.json({ error: depErr.message }, { status: 500 });
    }

    // Build Binance Pay order request
    const timestamp = Date.now().toString();
    const nonce = generateNonce();

    const orderBody = {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo: tradeNo,
      orderAmount: Number(amount).toFixed(2),
      currency: "USDT",
      description: `Growence Media - Top Up $${amount}`,
      goodsType: "02", // Virtual goods
      returnUrl: `${SITE_URL}/dashboard?deposit=success`,
      cancelUrl: `${SITE_URL}/dashboard?deposit=cancelled`,
      webhookUrl: `${SITE_URL}/api/payments/binance-webhook`,
    };

    const bodyStr = JSON.stringify(orderBody);
    const signature = signPayload(timestamp, nonce, bodyStr);

    // Call Binance Pay API
    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v3/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": BINANCE_API_KEY,
        "BinancePay-Signature": signature,
      },
      body: bodyStr,
    });

    const result = await response.json();

    if (result.status !== "SUCCESS") {
      // Update deposit as failed
      await supabase.from("deposits").update({ status: "rejected", admin_note: `Binance Error: ${result.code} - ${result.errorMessage || ""}` }).eq("id", deposit.id);
      console.error("Binance Pay Error:", result);
      return NextResponse.json({ error: result.errorMessage || "Binance Pay error", code: result.code }, { status: 400 });
    }

    // Update deposit with prepay ID
    await supabase.from("deposits").update({
      transaction_id: tradeNo,
      admin_note: `prepayId: ${result.data?.prepayId || ""}`,
    }).eq("id", deposit.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: result.data?.universalUrl || result.data?.checkoutUrl || "",
      qrcodeLink: result.data?.qrcodeLink || "",
      prepayId: result.data?.prepayId || "",
      tradeNo,
      depositId: deposit.id,
    });

  } catch (err: any) {
    console.error("Binance Pay create error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
