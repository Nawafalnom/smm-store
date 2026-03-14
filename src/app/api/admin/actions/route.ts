import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "growence-media-admin-secret-key-2024";
const COOKIE_NAME = "gm_admin_session";

// Use the anon key but we'll add proper RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Verify admin session from cookie
function verifyAdminSession(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return false;
  try {
    const [data, sig] = cookie.value.split(".");
    if (!data || !sig) return false;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
    if (sig !== expected) return false;
    const payload = JSON.parse(Buffer.from(data, "base64").toString());
    if (!payload.admin || payload.exp < Date.now()) return false;
    return true;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  // Verify admin session
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      // ═══ Update user balance ═══
      case "update_balance": {
        const { user_id, balance } = params;
        if (!user_id || balance === undefined) {
          return NextResponse.json({ error: "user_id and balance required" }, { status: 400 });
        }
        // Use RPC to bypass RLS
        const { error } = await supabase.rpc("admin_set_balance", {
          p_user_id: user_id,
          p_balance: Number(balance),
        });
        if (error) {
          // Fallback: direct update (works if RLS allows)
          const { error: err2 } = await supabase.from("profiles").update({ balance: Number(balance) }).eq("id", user_id);
          if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      // ═══ Add balance (increment) ═══
      case "add_balance": {
        const { user_id, amount } = params;
        if (!user_id || !amount) {
          return NextResponse.json({ error: "user_id and amount required" }, { status: 400 });
        }
        const { error } = await supabase.rpc("admin_add_balance", {
          p_user_id: user_id,
          p_amount: Number(amount),
        });
        if (error) {
          // Fallback
          const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user_id).single();
          if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
          const { error: err2 } = await supabase.from("profiles").update({ balance: profile.balance + Number(amount) }).eq("id", user_id);
          if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      // ═══ Approve deposit ═══
      case "approve_deposit": {
        const { deposit_id, admin_note } = params;
        if (!deposit_id) return NextResponse.json({ error: "deposit_id required" }, { status: 400 });

        const { data: deposit } = await supabase
          .from("deposits")
          .select("*")
          .eq("id", deposit_id)
          .single();
        if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
        if (deposit.status === "approved") return NextResponse.json({ error: "Already approved" }, { status: 400 });

        // Update deposit
        await supabase.from("deposits").update({
          status: "approved",
          admin_note: admin_note || "تم القبول من الأدمن",
          updated_at: new Date().toISOString(),
        }).eq("id", deposit_id);

        // Add balance
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

        return NextResponse.json({ success: true });
      }

      // ═══ Toggle API access ═══
      case "toggle_api": {
        const { user_id, enabled } = params;
        if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
        const { error } = await supabase
          .from("profiles")
          .update({ api_enabled: !!enabled })
          .eq("id", user_id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
