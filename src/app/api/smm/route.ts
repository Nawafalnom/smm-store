import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://smmjob.com/api/v2";
const API_KEY = process.env.SMM_API_KEY || "";

async function callSmmApi(params: Record<string, string>) {
  const body = new URLSearchParams({ key: API_KEY, ...params });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    let result;

    switch (action) {
      case "services":
        result = await callSmmApi({ action: "services" });
        break;

      case "balance":
        result = await callSmmApi({ action: "balance" });
        break;

      case "add": {
        const orderParams: Record<string, string> = {
          action: "add",
          service: params.service,
          link: params.link,
          quantity: params.quantity,
        };
        if (params.runs) orderParams.runs = params.runs;
        if (params.interval) orderParams.interval = params.interval;
        if (params.comments) orderParams.comments = params.comments;
        result = await callSmmApi(orderParams);
        break;
      }

      case "status":
        if (params.orders) {
          result = await callSmmApi({ action: "status", orders: params.orders });
        } else {
          result = await callSmmApi({ action: "status", order: params.order });
        }
        break;

      case "refill":
        if (params.orders) {
          result = await callSmmApi({ action: "refill", orders: params.orders });
        } else {
          result = await callSmmApi({ action: "refill", order: params.order });
        }
        break;

      case "refill_status":
        if (params.refills) {
          result = await callSmmApi({ action: "refill_status", refills: params.refills });
        } else {
          result = await callSmmApi({ action: "refill_status", refill: params.refill });
        }
        break;

      case "cancel":
        result = await callSmmApi({ action: "cancel", orders: params.orders });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("SMM API Error:", err);
    return NextResponse.json({ error: err.message || "API error" }, { status: 500 });
  }
}
