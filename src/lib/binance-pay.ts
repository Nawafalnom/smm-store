// Binance Pay API helper — with Cloudflare Worker proxy support

const API_KEY = process.env.BINANCE_PAY_API_KEY || "";
const SECRET_KEY = process.env.BINANCE_PAY_SECRET_KEY || "";
const PROXY_URL = process.env.BINANCE_PROXY_URL || "";
const PROXY_SECRET = process.env.BINANCE_PROXY_SECRET || "growence-binance-2024";
const BASE_URL = "https://bpay.binanceapi.com";

function nonce(len = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

async function hmacSha512(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function sign(timestamp: number, nonceStr: string, body: string): Promise<string> {
  return hmacSha512(SECRET_KEY, `${timestamp}\n${nonceStr}\n${body}\n`);
}

export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  if (!SECRET_KEY) return false;
  const expected = await hmacSha512(SECRET_KEY, payload);
  return expected === signature.toUpperCase();
}

// Make authenticated request — send pre-serialized bodyStr to proxy to preserve signature match
async function binanceRequest(endpoint: string, body: object): Promise<any> {
  const timestamp = Date.now();
  const nonceStr = nonce();
  const bodyStr = JSON.stringify(body);
  const signature = await sign(timestamp, nonceStr, bodyStr);

  const headers: Record<string, string> = {
    "BinancePay-Timestamp": String(timestamp),
    "BinancePay-Nonce": nonceStr,
    "BinancePay-Certificate-SN": API_KEY,
    "BinancePay-Signature": signature,
  };

  if (PROXY_URL) {
    // Send bodyStr as raw string so proxy forwards EXACT same bytes used for signature
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        endpoint,
        bodyStr,  // raw JSON string (not object!)
        headers,
      }),
    });
    return res.json();
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: bodyStr,
  });
  return res.json();
}

export async function createBinanceOrder(params: {
  amount: number; depositId: string; userId: string; returnUrl: string; webhookUrl: string;
}): Promise<{ success: boolean; checkoutUrl?: string; prepayId?: string; error?: string }> {
  if (!API_KEY || !SECRET_KEY) return { success: false, error: "Binance Pay not configured" };

  try {
    const merchantTradeNo = `GM${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const result = await binanceRequest("/binancepay/openapi/v3/order", {
      env: { terminalType: "WEB" },
      merchantTradeNo,
      orderAmount: params.amount.toFixed(2),
      currency: "USDT",
      description: `SMMSYRIA - Top Up $${params.amount}`,
      goodsDetails: [{
        goodsType: "02", goodsCategory: "Z000",
        referenceGoodsId: params.depositId,
        goodsName: `Balance Top-Up $${params.amount}`,
        goodsDetail: `SMMSYRIA account funding`,
      }],
      returnUrl: params.returnUrl,
      cancelUrl: params.returnUrl,
      webhookUrl: params.webhookUrl,
      orderExpireTime: Date.now() + 30 * 60 * 1000,
    });

    if (result.status === "SUCCESS" && result.data) {
      return { success: true, checkoutUrl: result.data.checkoutUrl || result.data.universalUrl, prepayId: result.data.prepayId };
    }
    console.error("Binance Pay API response:", JSON.stringify(result));
    return { success: false, error: `[${result.code || result.status}] ${result.errorMessage || JSON.stringify(result)}` };
  } catch (err: any) {
    console.error("Binance Pay create order error:", err);
    return { success: false, error: err.message };
  }
}

export async function queryBinanceOrder(prepayId: string): Promise<{ success: boolean; status?: string; transactionId?: string; error?: string }> {
  if (!API_KEY || !SECRET_KEY) return { success: false, error: "Binance Pay not configured" };
  try {
    const result = await binanceRequest("/binancepay/openapi/v2/order/query", { prepayId });
    if (result.status === "SUCCESS" && result.data) {
      return { success: true, status: result.data.status, transactionId: result.data.transactionId || "" };
    }
    return { success: false, error: result.errorMessage || "Query failed" };
  } catch (err: any) { return { success: false, error: err.message }; }
}
