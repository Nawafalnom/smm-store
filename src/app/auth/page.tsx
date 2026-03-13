"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, STORE } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    full_name: "",
    otp: "",
  });

  // Capture referral code from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setRefCode(ref);
      setMode("register");
      // Clean URL
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  async function handleSubmit() {
    if (!form.email || !form.password) {
      toast.error("الرجاء تعبئة جميع الحقول");
      return;
    }
    if (mode === "register" && !form.username) {
      toast.error("الرجاء إدخال اسم المستخدم");
      return;
    }

    setLoading(true);
    try {
      if (mode === "verify") {
        // Verify OTP code
        const { data: verifyData, error } = await supabase.auth.verifyOtp({
          email: form.email,
          token: form.otp,
          type: "signup",
        });
        if (error) throw error;

        // After verification, link referral if we have a code
        if (refCode && verifyData?.user?.id) {
          await linkReferral(verifyData.user.id, refCode);
        }

        toast.success("تم تأكيد البريد بنجاح!");
        router.push("/dashboard");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح!");
        router.push("/dashboard");
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              username: form.username,
              full_name: form.full_name,
            },
          },
        });
        if (error) throw error;

        // If auto-confirmed (no email verification needed), link referral now
        if (signUpData?.user?.id && signUpData?.session) {
          if (refCode) await linkReferral(signUpData.user.id, refCode);
          toast.success("تم إنشاء الحساب بنجاح!");
          router.push("/dashboard");
          return;
        }

        toast.success("تم إرسال كود التأكيد إلى بريدك الإلكتروني!");
        setMode("verify");
      }
    } catch (err: any) {
      const msg = err.message?.includes("already registered")
        ? "البريد الإلكتروني مسجّل مسبقاً"
        : err.message?.includes("Invalid login")
        ? "البريد أو كلمة المرور غير صحيحة"
        : err.message?.includes("Email not confirmed")
        ? "البريد غير مؤكد. تحقق من بريدك الإلكتروني"
        : err.message?.includes("Token has expired")
        ? "انتهت صلاحية الكود. أعد الإرسال"
        : err.message?.includes("Invalid")
        ? "الكود غير صحيح. حاول مرة أخرى"
        : err.message || "حدث خطأ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Link referral: find referrer by code, update referred_by
  async function linkReferral(userId: string, code: string) {
    try {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code.toUpperCase())
        .single();
      
      if (referrer && referrer.id !== userId) {
        await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
      }
    } catch { /* silently fail */ }
  }

  async function handleGoogleLogin() {
    // Store ref code before redirect
    if (refCode && typeof window !== "undefined") {
      localStorage.setItem("growence_ref", refCode);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error("خطأ في تسجيل الدخول بجوجل");
  }

  const C = STORE.color;

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-900 text-lg"
              style={{ background: `${C}20`, border: `1px solid ${C}40`, color: C }}>G</div>
            <span className="font-display font-800 text-xl" style={{ color: C }}>Growence</span>
            <span className="font-display font-800 text-xl text-white">Media</span>
          </Link>

          {/* Title */}
          <h1 className="font-display text-3xl font-900 text-white mb-2">
            {mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب" : "تأكيد البريد الإلكتروني"}
          </h1>
          <p className="text-gray-500 mb-8">
            {mode === "login" ? "ادخل بياناتك للمتابعة" : mode === "register" ? "أنشئ حسابك وابدأ بطلب الخدمات" : `أدخل الكود المرسل إلى ${form.email}`}
          </p>

          {/* Form Card */}
          <div className="card-dark p-7">
            {/* Referral Banner */}
            {refCode && mode === "register" && (
              <div className="rounded-xl p-3 mb-4 text-center text-sm" style={{ background: "#10b98110", border: "1px solid #10b98125" }}>
                <span className="text-green-400 font-bold">🎉 تم دعوتك!</span>
                <span className="text-gray-400 mr-1">كود الإحالة: </span>
                <span className="font-mono font-bold" style={{ color: STORE.accentColor }}>{refCode}</span>
              </div>
            )}
            <div className="space-y-4">
              {mode === "verify" ? (
                <>
                  {/* OTP Verification */}
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-3">📧</div>
                    <p className="text-gray-400 text-sm">تحقق من بريدك الإلكتروني وأدخل كود التأكيد المكوّن من 6 أرقام</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1.5">كود التأكيد</label>
                    <input type="text" value={form.otp} maxLength={6}
                      onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/[^0-9]/g, "") })}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="000000" className="admin-input text-center !text-2xl !tracking-[0.5em] !font-mono" dir="ltr" />
                  </div>
                  <button onClick={handleSubmit} disabled={loading || form.otp.length < 6}
                    className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: STORE.accentColor }}>
                    {loading ? "جاري التحقق..." : "تأكيد الحساب"}
                  </button>
                  <button onClick={async () => {
                    const { error } = await supabase.auth.resend({ type: "signup", email: form.email });
                    if (error) toast.error("خطأ في إعادة الإرسال");
                    else toast.success("تم إعادة إرسال الكود!");
                  }} className="w-full text-sm text-gray-500 hover:underline" style={{ color: C }}>
                    لم يصلك الكود؟ أعد الإرسال
                  </button>
                </>
              ) : (
                <>
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1.5">اسم المستخدم</label>
                    <div className="relative">
                      <input type="text" value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="username" className="admin-input !pr-10" dir="ltr" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">👤</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1.5">الاسم الكامل</label>
                    <input type="text" value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="الاسم الكامل" className="admin-input" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com" className="admin-input !pr-10" dir="ltr" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">📧</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input type="password" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="••••••••" className="admin-input !pr-10" dir="ltr" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">🔒</span>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                    <input type="checkbox" className="rounded" style={{ accentColor: C }} />
                    تذكّرني
                  </label>
                  <button className="hover:underline" style={{ color: C }}>نسيت كلمة المرور؟</button>
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: STORE.accentColor }}>
                {loading ? "جاري التحميل..." : mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء الحساب" : "تأكيد"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center"><span className="bg-dark-700 px-4 text-gray-600 text-sm">OR</span></div>
              </div>

              <button onClick={handleGoogleLogin}
                className="w-full py-3 rounded-xl font-bold text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition flex items-center justify-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                تسجيل الدخول بحساب Google
              </button>
                </>
              )}
            </div>
          </div>

          {/* Toggle */}
          {mode !== "verify" && (
          <p className="text-center text-gray-500 mt-6 text-sm">
            {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-bold mr-1 hover:underline" style={{ color: C }}>
              {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
            </button>
          </p>
          )}
        </div>
      </div>

      {/* Left Side - Hero (Desktop) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C}10, #0a0a0f)` }}>
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-[100px]" style={{ background: C, opacity: 0.1 }} />
        <div className="relative text-center px-12">
          <h2 className="font-display text-4xl font-900 text-white mb-4">
            عزّز وجودك الرقمي مع
          </h2>
          <h3 className="font-display text-5xl font-900 neon-text mb-6" style={{ color: C }}>
            {STORE.name}
          </h3>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            نقدم لك أسرع وأرخص خدمات التسويق الإلكتروني. زيادة متابعين، لايكات، ومشاهدات لجميع منصات التواصل الاجتماعي.
          </p>
          <div className="flex justify-center gap-8">
            {[{ v: "50K+", l: "عميل سعيد" }, { v: "10M+", l: "طلب مكتمل" }].map((s, i) => (
              <div key={i}>
                <div className="font-display text-3xl font-900 text-white">{s.v}</div>
                <div className="text-gray-500 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
