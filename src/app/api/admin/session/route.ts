import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyTOTP, generateSecret, generateOTPAuthURI } from "@/lib/totp";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456";
const SESSION_SECRET = process.env.SESSION_SECRET || "growence-media-admin-secret-key-2024";
const TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || ""; // If empty, 2FA is disabled
const COOKIE_NAME = "gm_admin_session";

function createToken(): string {
  const payload = {
    admin: true,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifyToken(token: string): boolean {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return false;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
    if (sig !== expected) return false;
    const payload = JSON.parse(Buffer.from(data, "base64").toString());
    if (!payload.admin || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function setCookieHeader(token: string): string {
  const maxAge = 7 * 24 * 60 * 60;
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export async function POST(req: NextRequest) {
  try {
    const { action, password, totp_code } = await req.json();

    // Login - create session
    if (action === "login") {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" });
      }

      // 2FA check (if TOTP secret is configured)
      if (TOTP_SECRET) {
        if (!totp_code) {
          return NextResponse.json({ success: false, error: "أدخل رمز التحقق (2FA)", require_2fa: true });
        }
        if (!verifyTOTP(TOTP_SECRET, totp_code)) {
          return NextResponse.json({ success: false, error: "رمز التحقق غير صحيح أو منتهي", require_2fa: true });
        }
      }

      const token = createToken();
      const res = NextResponse.json({ success: true });
      res.headers.set("Set-Cookie", setCookieHeader(token));
      return res;
    }

    // Verify session
    if (action === "verify") {
      const cookie = req.cookies.get(COOKIE_NAME);
      if (!cookie?.value || !verifyToken(cookie.value)) {
        return NextResponse.json({ success: false });
      }
      return NextResponse.json({ success: true });
    }

    // Check if 2FA is enabled
    if (action === "check_2fa") {
      return NextResponse.json({ enabled: !!TOTP_SECRET });
    }

    // Setup 2FA — generates a new secret (only works if no secret is set yet)
    if (action === "setup_2fa") {
      // Require admin password
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" });
      }

      const secret = TOTP_SECRET || generateSecret();
      const uri = generateOTPAuthURI(secret, "admin", "SMMSYRIA");

      return NextResponse.json({
        success: true,
        secret,
        uri,
        instruction: "1. امسح الـ QR بتطبيق Google Authenticator\n2. أضف ADMIN_TOTP_SECRET في Vercel ENV\n3. اعمل Redeploy",
      });
    }

    // Logout
    if (action === "logout") {
      const res = NextResponse.json({ success: true });
      res.headers.set("Set-Cookie", clearCookieHeader());
      return res;
    }

    return NextResponse.json({ success: false, error: "Invalid action" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
