"use client";

import { useState } from "react";
import { STORE } from "@/lib/supabase";
import toast from "react-hot-toast";

const A = STORE.accentColor;

export default function Setup2FAPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");

  async function handleSetup() {
    if (!password.trim()) { toast.error("أدخل كلمة مرور الأدمن"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup_2fa", password }),
      }).then(r => r.json());

      if (res.success) {
        setSecret(res.secret);
        setUri(res.uri);
        toast.success("تم إنشاء مفتاح 2FA!");
      } else {
        toast.error(res.error || "خطأ");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-lg card-dark p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="font-display text-2xl font-800 text-white mb-2">إعداد المصادقة الثنائية (2FA)</h1>
          <p className="text-gray-500 text-sm">حماية لوحة الأدمن بطبقة أمان إضافية</p>
        </div>

        {!secret ? (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">كلمة مرور الأدمن</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSetup()}
                placeholder="كلمة المرور" className="admin-input text-center" dir="ltr" autoFocus />
            </div>
            <button onClick={handleSetup} disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${A}, ${A}cc)` }}>
              {loading ? "جاري الإنشاء..." : "🔐 إنشاء مفتاح 2FA"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Step 1: QR Code */}
            <div className="rounded-xl p-5 text-center" style={{ background: "#10b98108", border: "1px solid #10b98120" }}>
              <h3 className="text-green-400 font-bold mb-3">1️⃣ امسح هذا الـ QR بتطبيق المصادقة</h3>
              <p className="text-gray-500 text-xs mb-3">Google Authenticator أو Authy أو Microsoft Authenticator</p>
              <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`}
                  alt="2FA QR Code" width={200} height={200} />
              </div>
            </div>

            {/* Step 2: Manual Secret */}
            <div className="rounded-xl p-5" style={{ background: "#f59e0b08", border: "1px solid #f59e0b15" }}>
              <h3 className="text-yellow-400 font-bold mb-3">2️⃣ أو أدخل المفتاح يدوياً</h3>
              <div className="flex gap-2">
                <input type="text" value={secret} readOnly className="admin-input flex-1 !text-xs font-mono" dir="ltr" />
                <button onClick={() => { navigator.clipboard.writeText(secret); toast.success("تم النسخ!"); }}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0" style={{ background: A }}>📋 نسخ</button>
              </div>
            </div>

            {/* Step 3: Add to Vercel */}
            <div className="rounded-xl p-5" style={{ background: "#ef444408", border: "1px solid #ef444420" }}>
              <h3 className="text-red-400 font-bold mb-3">3️⃣ أضف المفتاح في Vercel (مهم!)</h3>
              <div className="text-gray-400 text-sm space-y-2">
                <p>روح <strong className="text-white">Vercel</strong> → Settings → Environment Variables → أضف:</p>
                <div className="rounded-lg p-3 font-mono text-xs bg-black/30" dir="ltr">
                  ADMIN_TOTP_SECRET = {secret}
                </div>
                <p>ثم اعمل <strong className="text-white">Redeploy</strong></p>
                <p className="text-red-400 text-xs mt-2">⚠️ بدون هذه الخطوة، الـ 2FA لن يعمل!</p>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-xl p-4 text-center text-xs text-gray-500" style={{ background: "#1a1a28" }}>
              ⚠️ احفظ المفتاح في مكان آمن. إذا فقدت الوصول لتطبيق المصادقة، ستحتاج لحذف ADMIN_TOTP_SECRET من Vercel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
