import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getProvider(providerId: string) {
  const { data } = await supabase
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .single();
  return data;
}

async function callProviderApi(apiUrl: string, apiKey: string, params: Record<string, string>) {
  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { provider_id, action, ...params } = await req.json();

    if (!provider_id) {
      return NextResponse.json({ error: "provider_id required" }, { status: 400 });
    }

    const provider = await getProvider(provider_id);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    if (!provider.is_active) {
      return NextResponse.json({ error: "Provider is disabled" }, { status: 403 });
    }

    const apiUrl = provider.api_url;
    const apiKey = provider.api_key;

    let result;

    switch (action) {
      case "services":
        result = await callProviderApi(apiUrl, apiKey, { action: "services" });
        break;

      case "balance":
        result = await callProviderApi(apiUrl, apiKey, { action: "balance" });
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
        result = await callProviderApi(apiUrl, apiKey, orderParams);
        break;
      }

      case "status":
        if (params.orders) {
          result = await callProviderApi(apiUrl, apiKey, { action: "status", orders: params.orders });
        } else {
          result = await callProviderApi(apiUrl, apiKey, { action: "status", order: params.order });
        }
        break;

      case "refill":
        if (params.orders) {
          result = await callProviderApi(apiUrl, apiKey, { action: "refill", orders: params.orders });
        } else {
          result = await callProviderApi(apiUrl, apiKey, { action: "refill", order: params.order });
        }
        break;

      case "refill_status":
        if (params.refills) {
          result = await callProviderApi(apiUrl, apiKey, { action: "refill_status", refills: params.refills });
        } else {
          result = await callProviderApi(apiUrl, apiKey, { action: "refill_status", refill: params.refill });
        }
        break;

      case "cancel":
        result = await callProviderApi(apiUrl, apiKey, { action: "cancel", orders: params.orders });
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
