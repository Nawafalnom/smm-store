import crypto from "crypto";

const API_KEY = process.env.BINANCE_PAY_API_KEY || "";
const SECRET_KEY = process.env.BINANCE_PAY_SECRET_KEY || "";
const BASE_URL = "https://bpay.binanceapi.com";

// Generate nonce
function nonce(len = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// Generate signature for Binance Pay API
function sign(timestamp: number, nonceStr: string, body: string): string {
  const payload = `${timestamp}\n${nonceStr}\n${body}\n`;
  return crypto.createHmac("sha512", SECRET_KEY).update(payload).digest("hex").toUpperCase();
}

// Verify webhook signature from Binance
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!SECRET_KEY) return false;
  // Binance sends signature as HMAC-SHA512 of the raw body
  const expected = crypto.createHmac("sha512", SECRET_KEY).update(payload).digest("hex").toUpperCase();
  return expected === signature.toUpperCase();
}

// Make authenticated request to Binance Pay API
async function binanceRequest(endpoint: string, body: object): Promise<any> {
  const timestamp = Date.now();
  const nonceStr = nonce();
  const bodyStr = JSON.stringify(body);
  const signature = sign(timestamp, nonceStr, bodyStr);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": String(timestamp),
      "BinancePay-Nonce": nonceStr,
      "BinancePay-Certificate-SN": API_KEY,
      "BinancePay-Signature": signature,
    },
    body: bodyStr,
  });

  return res.json();
}

/**
 * Create a Binance Pay order
 * Returns checkout URL that user can pay through
 */
export async function createBinanceOrder(params: {
  amount: number;
  depositId: string;
  userId: string;
  returnUrl: string;
  webhookUrl: string;
}): Promise<{
  success: boolean;
  checkoutUrl?: string;
  prepayId?: string;
  error?: string;
}> {
  if (!API_KEY || !SECRET_KEY) {
    return { success: false, error: "Binance Pay not configured" };
  }

  try {
    const merchantTradeNo = `GM${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const result = await binanceRequest("/binancepay/openapi/v3/order", {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo,
      orderAmount: params.amount.toFixed(2),
      currency: "USDT",
      description: `Growence Media - Top Up $${params.amount}`,
      goodsDetails: [
        {
          goodsType: "02", // virtual goods
          goodsCategory: "Z000", // others
          referenceGoodsId: params.depositId,
          goodsName: `Balance Top-Up $${params.amount}`,
          goodsDetail: `Growence Media account funding`,
        },
      ],
      returnUrl: params.returnUrl,
      cancelUrl: params.returnUrl,
      webhookUrl: params.webhookUrl,
      orderExpireTime: Date.now() + 30 * 60 * 1000, // 30 min expiry
    });

    if (result.status === "SUCCESS" && result.data) {
      return {
        success: true,
        checkoutUrl: result.data.checkoutUrl || result.data.universalUrl,
        prepayId: result.data.prepayId,
      };
    }

    return { success: false, error: result.errorMessage || result.code || "Unknown error" };
  } catch (err: any) {
    console.error("Binance Pay create order error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Query order status
 */
export async function queryBinanceOrder(prepayId: string): Promise<{
  success: boolean;
  status?: string; // INITIAL, PENDING, PAID, CANCELED, ERROR, REFUNDING, REFUNDED, EXPIRED
  transactionId?: string;
  error?: string;
}> {
  if (!API_KEY || !SECRET_KEY) {
    return { success: false, error: "Binance Pay not configured" };
  }

  try {
    const result = await binanceRequest("/binancepay/openapi/v2/order/query", {
      prepayId,
    });

    if (result.status === "SUCCESS" && result.data) {
      return {
        success: true,
        status: result.data.status,
        transactionId: result.data.transactionId || "",
      };
    }

    return { success: false, error: result.errorMessage || "Query failed" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
