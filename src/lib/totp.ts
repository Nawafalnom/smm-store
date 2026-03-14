import crypto from "crypto";

// ═══ TOTP (Time-based One-Time Password) ═══
// Compatible with Google Authenticator, Authy, Microsoft Authenticator

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_WINDOW = 1; // allow 1 period before/after (for clock drift)

// Base32 decode
function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = encoded.replace(/[\s=-]/g, "").toUpperCase();
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

// Base32 encode
function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

// Generate HMAC-based OTP
function generateHOTP(secret: Buffer, counter: number): string {
  // Convert counter to 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", secret).update(counterBuf).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % Math.pow(10, TOTP_DIGITS)).padStart(TOTP_DIGITS, "0");
}

// Generate current TOTP code
export function generateTOTP(secretBase32: string): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  return generateHOTP(secret, counter);
}

// Verify a TOTP code (with time window for clock drift)
export function verifyTOTP(secretBase32: string, code: string): boolean {
  if (!secretBase32 || !code || code.length !== TOTP_DIGITS) return false;
  
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);

  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const expected = generateHOTP(secret, counter + i);
    if (expected === code) return true;
  }
  return false;
}

// Generate a random TOTP secret (base32, 20 bytes = 32 chars)
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

// Generate otpauth:// URI for QR code (Google Authenticator format)
export function generateOTPAuthURI(secret: string, account: string, issuer: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}
