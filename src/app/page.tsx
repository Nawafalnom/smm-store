"use client";

import { useEffect } from "react";
import Link from "next/link";
import { STORE } from "@/lib/supabase";
import FacebookPixel from "@/components/FacebookPixel";

const C = STORE.color;
const A = STORE.accentColor;

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", C);
    document.documentElement.style.setProperty("--brand-rgb", STORE.colorRgb);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e17]" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      {STORE.pixel && <FacebookPixel pixelId={STORE.pixel} />}

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e17]/90 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display font-900 text-2xl tracking-tight">
            <span className="text-white">SMM</span><span style={{ color: A }}>SYRIA</span>
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400 font-bold">
            <Link href="/auth" className="hover:text-white transition">تسجيل الدخول</Link>
            <a href="#services" className="hover:text-white transition">الخدمات</a>
            <a href="#api" className="hover:text-white transition">API</a>
            <a href="#features" className="hover:text-white transition">المميزات</a>
          </div>
          <Link href="/auth" className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110" style={{ background: A }}>
            إنشاء حساب
          </Link>
        </div>
      </nav>

      {/* HERO — Split Layout */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[150px]" style={{ background: A }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[120px]" style={{ background: "#ff0000" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Right — Content */}
            <div className="order-2 lg:order-1 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 animate-slide-up" style={{ background: `${A}15`, border: `1px solid ${A}30` }}>
                <span className="text-sm font-bold" style={{ color: A }}>🚀 السيرفر رقم 1 في الشرق الأوسط</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-900 leading-tight mb-6 animate-slide-up delay-1 opacity-0">
                <span className="text-white">عزّز وجودك الرقمي مع</span><br />
                <span className="mt-2 block"><span className="text-white">SMM</span><span style={{ color: A }}>SYRIA</span></span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mr-0 animate-slide-up delay-2 opacity-0">
                نقدم لك أسرع وأرخص خدمات التسويق الإلكتروني. زيادة متابعين، لايكات، ومشاهدات لجميع منصات التواصل الاجتماعي بجودة عالية وضمان حقيقي.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-8 animate-slide-up delay-3 opacity-0">
                {[{ v: "24/7", l: "دعم فني" }, { v: "+1,694", l: "خدمة مفعّلة" }, { v: "+10M", l: "طلب مكتمل" }, { v: "+50K", l: "عميل سعيد" }].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="font-display text-2xl md:text-3xl font-900" style={{ color: i === 0 ? A : "white" }}>{s.v}</div>
                    <div className="text-gray-500 text-xs mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Left — Login Card */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-start animate-slide-up delay-2 opacity-0">
              <div className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111827, #0f172a)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none" style={{ background: A, opacity: 0.1 }} />
                <h2 className="font-display text-xl font-800 text-white text-center mb-2">تسجيل الدخول</h2>
                <p className="text-gray-500 text-sm text-center mb-6">ادخل بياناتك للمتابعة</p>
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" placeholder="اسم المستخدم أو البريد" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm placeholder-gray-600 focus:border-white/20 focus:outline-none transition" dir="ltr" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">👤</span>
                  </div>
                  <div className="relative">
                    <input type="password" placeholder="كلمة المرور" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm placeholder-gray-600 focus:border-white/20 focus:outline-none transition" dir="ltr" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">🔒</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-500 cursor-pointer"><input type="checkbox" className="rounded" style={{ accentColor: A }} />تذكّرني</label>
                    <Link href="/auth" className="hover:underline" style={{ color: A }}>نسيت كلمة المرور؟</Link>
                  </div>
                  <Link href="/auth" className="block w-full py-3.5 rounded-xl font-bold text-center text-white transition-all hover:brightness-110" style={{ background: A }}>تسجيل الدخول</Link>
                  <div className="relative my-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div><div className="relative flex justify-center"><span className="bg-[#111827] px-4 text-gray-600 text-xs">OR</span></div></div>
                  <Link href="/auth" className="block w-full py-3 rounded-xl font-bold text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition text-center">
                    <span className="inline-flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>تسجيل الدخول بحساب Google</span>
                  </Link>
                </div>
                <p className="text-center text-gray-500 mt-5 text-sm">ليس لديك حساب؟ <Link href="/auth" className="font-bold mr-1 hover:underline" style={{ color: A }}>إنشاء حساب</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Platforms */}
      <div className="relative overflow-hidden border-y border-white/5 bg-[#0d1117] py-4">
        <div className="flex animate-scroll gap-8 whitespace-nowrap">
          {["📸 Instagram", "🎵 TikTok", "▶️ YouTube", "📘 Facebook", "𝕏 Twitter", "✈️ Telegram", "👻 Snapchat", "🎧 Spotify", "💼 LinkedIn", "💬 Discord",
            "📸 Instagram", "🎵 TikTok", "▶️ YouTube", "📘 Facebook", "𝕏 Twitter", "✈️ Telegram", "👻 Snapchat", "🎧 Spotify", "💼 LinkedIn", "💬 Discord"].map((p, i) => (
            <div key={i} className="px-5 py-2 rounded-full border border-white/10 bg-white/[0.02] text-gray-400 text-sm font-bold shrink-0 hover:text-white hover:border-white/20 transition">{p}</div>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section id="services" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">خدماتنا المميزة</h2>
        <p className="text-center text-gray-500 mb-12">دعم كامل لجميع المنصات</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: "📘", name: "فيسبوك", desc: "متابعين، لايكات، مشاهدات" },
            { icon: "📸", name: "انستجرام", desc: "متابعين، لايكات، ريلز" },
            { icon: "🎵", name: "تيك توك", desc: "متابعين، مشاهدات، لايكات" },
            { icon: "▶️", name: "يوتيوب", desc: "مشتركين، مشاهدات، ساعات" },
            { icon: "𝕏", name: "تويتر", desc: "متابعين، ريتويت، لايكات" },
            { icon: "✈️", name: "تيليجرام", desc: "أعضاء، مشاهدات، تفاعل" },
            { icon: "👻", name: "سناب شات", desc: "متابعين، مشاهدات" },
            { icon: "🎧", name: "سبوتيفاي", desc: "مستمعين، متابعين" },
            { icon: "💼", name: "لينكدإن", desc: "متابعين، اتصالات" },
            { icon: "🌐", name: "زيارات مواقع", desc: "SEO، ترافيك حقيقي" },
            { icon: "⭐", name: "تقييمات جوجل", desc: "مراجعات 5 نجوم" },
            { icon: "🔧", name: "+20 منصة أخرى", desc: "اكتشف المزيد" },
          ].map((s, i) => (
            <Link href="/auth" key={i} className="rounded-2xl p-5 text-center transition-all hover:scale-[1.03]" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-white text-sm mb-1">{s.name}</h3>
              <p className="text-gray-500 text-[10px]">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-12">لماذا SMMSYRIA؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "⚡", title: "تنفيذ فوري", desc: "نظامنا آلي بالكامل. طلبك يبدأ خلال ثوانٍ." },
              { icon: "💰", title: "أرخص الأسعار", desc: "أسعار تبدأ من $0.001 — الأرخص بالشرق الأوسط." },
              { icon: "🛡️", title: "ضمان حقيقي", desc: "إعادة تعبئة وتعويض مجاني لجميع الخدمات." },
              { icon: "🎧", title: "دعم فني 24/7", desc: "فريق محترف جاهز للرد على مدار الساعة." },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl p-6 text-center transition-all hover:scale-[1.02]" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center text-2xl" style={{ background: `${A}15` }}>{f.icon}</div>
                <h3 className="font-display text-lg font-800 text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api" className="max-w-5xl mx-auto px-4 py-20">
        <div className="rounded-2xl p-8 md:p-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111827, #0f172a)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[100px] opacity-10" style={{ background: A }} />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl font-900 text-white mb-4">API للموزّعين</h2>
              <p className="text-gray-400 leading-relaxed mb-6">ابدأ ببيع خدماتنا من خلال API متوافق مع جميع لوحات SMM.</p>
              <div className="space-y-3 mb-6">
                {["متوافق مع جميع لوحات SMM", "أسعار جملة خاصة", "1600+ خدمة متاحة", "دعم فني مخصص للموزعين"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300 text-sm"><span style={{ color: A }}>✓</span> {f}</div>
                ))}
              </div>
              <Link href="/auth" className="inline-block px-8 py-3 rounded-xl font-bold text-white" style={{ background: A }}>احصل على API مجاناً</Link>
            </div>
            <div className="rounded-xl p-5 font-mono text-xs leading-relaxed" style={{ background: "#0a0e17", border: "1px solid rgba(255,255,255,0.06)" }} dir="ltr">
              <div className="text-gray-500 mb-2">// API Endpoint</div>
              <div className="text-green-400">POST /api/v2</div>
              <div className="text-gray-600 mt-3">&#123;</div>
              <div className="text-gray-300 mr-4">  &quot;key&quot;: <span className="text-yellow-400">&quot;YOUR_API_KEY&quot;</span>,</div>
              <div className="text-gray-300 mr-4">  &quot;action&quot;: <span className="text-yellow-400">&quot;add&quot;</span>,</div>
              <div className="text-gray-300 mr-4">  &quot;service&quot;: <span className="text-blue-400">1</span>,</div>
              <div className="text-gray-300 mr-4">  &quot;link&quot;: <span className="text-yellow-400">&quot;https://...&quot;</span>,</div>
              <div className="text-gray-300 mr-4">  &quot;quantity&quot;: <span className="text-blue-400">1000</span></div>
              <div className="text-gray-600">&#125;</div>
            </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="font-display text-3xl font-900 text-center text-white mb-3">الأكثر مبيعاً</h2>
        <p className="text-center text-gray-500 mb-10">أفضل الخدمات بأقل الأسعار</p>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-5 text-sm font-bold py-3 px-4" style={{ background: A }}>
            <div className="text-white col-span-2">الخدمة</div><div className="text-white text-center">$/1000</div><div className="text-white text-center">السرعة</div><div className="text-white text-center">طلب</div>
          </div>
          {[
            { name: "📸 متابعين انستجرام — ضمان 30 يوم", price: "$0.45", speed: "فوري ⚡" },
            { name: "🎵 مشاهدات تيك توك — جودة عالية", price: "$0.01", speed: "فوري ⚡" },
            { name: "▶️ ساعات مشاهدة يوتيوب — حقيقي", price: "$2.10", speed: "1K/يوم" },
            { name: "📘 متابعين فيسبوك — عرب حقيقيين", price: "$1.20", speed: "سريع" },
            { name: "𝕏 متابعين تويتر — ضمان مدى الحياة", price: "$0.80", speed: "فوري ⚡" },
          ].map((r, i) => (
            <div key={i} className={`grid grid-cols-5 text-sm py-4 px-4 items-center ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
              <div className="text-gray-300 col-span-2">{r.name}</div>
              <div className="text-center font-bold" style={{ color: A }}>{r.price}</div>
              <div className="text-center text-gray-400">{r.speed}</div>
              <div className="text-center"><Link href="/auth" className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: A }}>اطلب</Link></div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl font-900 text-center text-white mb-3">ماذا يقول عملاؤنا؟</h2>
        <p className="text-center text-gray-500 mb-12">+50 ألف عميل يثقون بـ SMMSYRIA</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "أحمد محمد", role: "صاحب متجر إلكتروني", text: "خدمة ممتازة وسريعة. أسعار لا تُقارن وضمان حقيقي!" },
            { name: "سارة خالد", role: "صانعة محتوى", text: "الأسعار هنا خيالية مقارنة بالجودة. أنصح الجميع." },
            { name: "محمد العلي", role: "مسوّق رقمي", text: "أفضل موقع تعاملت معه. الضمان حقيقي والتعويض فوري." },
          ].map((t, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRight: `3px solid ${A}` }}>
              <div className="flex gap-1 mb-3">{[1,2,3,4,5].map((s) => <span key={s} className="text-yellow-400 text-sm">⭐</span>)}</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
              <div className="font-bold text-white text-sm">{t.name}</div>
              <div className="text-gray-500 text-xs">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${A}10, transparent)` }}>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-white mb-4">جاهز تبدأ؟</h2>
          <p className="text-gray-400 mb-8 text-lg">سجّل مجاناً الآن وابدأ بتعزيز تواجدك الرقمي</p>
          <Link href="/auth" className="inline-block px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105" style={{ background: A, boxShadow: `0 0 40px ${A}30` }}>
            سجل الآن مجاناً ←
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-display font-900 text-xl"><span className="text-white">SMM</span><span style={{ color: A }}>SYRIA</span></span>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/auth" className="hover:text-white transition">تسجيل الدخول</Link>
              <a href="#services" className="hover:text-white transition">الخدمات</a>
              <a href="#api" className="hover:text-white transition">API</a>
              <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="hover:text-white transition">تواصل معنا</a>
            </div>
            <p className="text-gray-600 text-xs">© {new Date().getFullYear()} SMMSYRIA — جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
