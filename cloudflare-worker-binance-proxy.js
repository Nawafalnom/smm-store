/**
 * Cloudflare Worker — Binance Pay API Proxy v2
 * 
 * IMPORTANT: This version receives pre-serialized bodyStr to preserve
 * the exact JSON used for HMAC signature computation.
 *
 * UPDATE THIS IN YOUR CLOUDFLARE WORKER DASHBOARD!
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Secret",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });
    }

    const secret = request.headers.get("X-Proxy-Secret");
    if (secret !== (env.PROXY_SECRET || "growence-binance-2024")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const { endpoint, bodyStr, headers: binanceHeaders } = body;

      if (!endpoint || !bodyStr || !binanceHeaders) {
        return new Response(JSON.stringify({ error: "Missing endpoint, bodyStr, or headers" }), { 
          status: 400, headers: corsHeaders 
        });
      }

      // Forward EXACT bodyStr to Binance (same bytes used for signature)
      const binanceUrl = `https://bpay.binanceapi.com${endpoint}`;
      const res = await fetch(binanceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...binanceHeaders,
        },
        body: bodyStr,
      });

      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, headers: corsHeaders 
      });
    }
  },
};
