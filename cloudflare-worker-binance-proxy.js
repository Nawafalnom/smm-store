/**
 * Cloudflare Worker — Binance Pay API Proxy
 * 
 * Deploy this on Cloudflare Workers (free tier):
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 * 2. Name it "binance-proxy" 
 * 3. Paste this code → Deploy
 * 4. Add environment variable: PROXY_SECRET = "growence-binance-2024" (Settings → Variables)
 * 5. Copy your worker URL (e.g. https://binance-proxy.YOUR_NAME.workers.dev)
 * 6. Set BINANCE_PROXY_URL in Vercel env vars to that URL
 */

export default {
  async fetch(request, env) {
    // CORS headers
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

    // Verify proxy secret
    const secret = request.headers.get("X-Proxy-Secret");
    if (secret !== (env.PROXY_SECRET || "growence-binance-2024")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const { endpoint, payload, headers: binanceHeaders } = body;

      if (!endpoint || !payload || !binanceHeaders) {
        return new Response(JSON.stringify({ error: "Missing endpoint, payload, or headers" }), { 
          status: 400, headers: corsHeaders 
        });
      }

      // Forward request to Binance Pay API
      const binanceUrl = `https://bpay.binanceapi.com${endpoint}`;
      const res = await fetch(binanceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...binanceHeaders,
        },
        body: JSON.stringify(payload),
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
