import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456";
const TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || ""; // Base32 encoded secret

// Base32 decode
function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = encoded.replace(/[=\s]/g, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// Generate TOTP code for a given time
function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));
  
  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

// Verify TOTP with time window tolerance
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000 / timeStep);
  
  for (let i = -window; i <= window; i++) {
    const time = now + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));
    
    const key = base32Decode(secret);
    const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    const otp = (binary % Math.pow(10, 6)).toString().padStart(6, "0");
    if (otp === token) return true;
  }
  return false;
}

// Generate a random Base32 secret
function generateSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
}

export async function POST(req: NextRequest) {
  try {
    const { action, password, code } = await req.json();

    // Login verification
    if (action === "login") {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" });
      }

      const has2FA = !!TOTP_SECRET;

      if (!has2FA) {
        // No 2FA configured - login directly
        const token = crypto.randomBytes(32).toString("hex");
        return NextResponse.json({ success: true, token, requires2FA: false });
      }

      // 2FA required - return that we need the code
      return NextResponse.json({ success: true, requires2FA: true });
    }

    // 2FA verification
    if (action === "verify2fa") {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" });
      }
      if (!TOTP_SECRET) {
        return NextResponse.json({ success: false, error: "2FA not configured" });
      }
      if (!code || !verifyTOTP(TOTP_SECRET, code)) {
        return NextResponse.json({ success: false, error: "الكود غير صحيح أو منتهي" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      return NextResponse.json({ success: true, token });
    }

    // Verify existing token (for session persistence)
    if (action === "verifyToken") {
      // Simple check - token exists and password matches
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false });
      }
      return NextResponse.json({ success: true });
    }

    // Get 2FA setup info
    if (action === "setup2fa") {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "Unauthorized" });
      }

      const secret = TOTP_SECRET || generateSecret();
      const issuer = "Growence Media Admin";
      const account = "admin";
      const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;

      return NextResponse.json({
        success: true,
        secret,
        qrUrl,
        configured: !!TOTP_SECRET,
        message: TOTP_SECRET
          ? "2FA مفعّل بالفعل"
          : `أضف هذا السر في Environment Variables بـ Vercel:\nADMIN_TOTP_SECRET=${secret}`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
