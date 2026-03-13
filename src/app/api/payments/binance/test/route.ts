import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const apiKey = process.env.BINANCE_PAY_API_KEY || "";
  const secretKey = process.env.BINANCE_PAY_SECRET_KEY || "";
  const proxyUrl = process.env.BINANCE_PROXY_URL || "";

  // Show first 8 and last 4 chars only (safe)
  const maskKey = (k: string) => k ? `${k.slice(0, 8)}...${k.slice(-4)} (len:${k.length})` : "NOT SET";

  const info: any = {
    apiKey: maskKey(apiKey),
    secretKey: maskKey(secretKey),
    proxyUrl: proxyUrl || "NOT SET",
    apiKeyHasSpaces: apiKey !== apiKey.trim(),
    secretKeyHasSpaces: secretKey !== secretKey.trim(),
    apiKeyHasNewlines: apiKey.includes("\n") || apiKey.includes("\r"),
  };

  // Test proxy connection
  if (proxyUrl) {
    try {
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Proxy-Secret": process.env.BINANCE_PROXY_SECRET || "growence-binance-2024",
        },
        body: JSON.stringify({
          endpoint: "/binancepay/openapi/v2/order/query",
          payload: { prepayId: "test" },
          headers: {
            "BinancePay-Timestamp": String(Date.now()),
            "BinancePay-Nonce": "test123",
            "BinancePay-Certificate-SN": apiKey.trim(),
            "BinancePay-Signature": "test",
          },
        }),
      });
      const data = await res.json();
      info.proxyTest = data;
    } catch (err: any) {
      info.proxyTest = { error: err.message };
    }
  }

  return NextResponse.json(info);
}
