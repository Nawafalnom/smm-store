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
    <div className="min-h-screen bg-dark-900 bg-grid" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      {STORE.pixel && <FacebookPixel pixelId={STORE.pixel} />}

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-900 text-lg"
              style={{ background: `${C}20`, border: `1px solid ${C}40`, color: C }}>G</div>
            <span className="font-display font-800 text-xl" style={{ color: C }}>Growence</span>
            <span className="font-display font-800 text-xl text-white">Media</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#services" className="hover:text-white transition">الخدمات</a>
            <a href="#features" className="hover:text-white transition">المميزات</a>
            <a href="#pricing" className="hover:text-white transition">الأسعار</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-gray-400 hover:text-white transition font-bold">تسجيل الدخول</Link>
            <Link href="/auth" className="px-5 py-2 rounded-xl font-bold text-sm text-white" style={{ background: A }}>
              إنشاء حساب
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial" />
        <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: C }} />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full opacity-8 blur-[120px]" style={{ background: A }} />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="flex justify-center mb-8">
            <div className="px-5 py-2 rounded-full text-sm font-bold animate-slide-up"
              style={{ background: `${C}15`, border: `1px solid ${C}30`, color: C }}>
              🚀 السيرفر رقم 1 في الشرق الأوسط
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-900 text-center leading-tight mb-6 animate-slide-up delay-1 opacity-0">
            <span className="text-white">عزّز وجودك الرقمي مع</span><br />
            <span className="neon-text" style={{ color: C }}>Growence Media</span>
          </h1>
          <p className="text-center text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-slide-up delay-2 opacity-0">
            نقدم لك أسرع وأرخص خدمات التسويق الإلكتروني. زيادة متابعين، لايكات، ومشاهدات لجميع منصات التواصل الاجتماعي بجودة عالية وضمان حقيقي.
          </p>
          <div className="flex justify-center gap-4 mb-16 animate-slide-up delay-3 opacity-0">
            <Link href="/auth" className="px-8 py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-105"
              style={{ background: A, boxShadow: `0 0 30px ${A}40` }}>
              سجل الآن مجاناً ←
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 animate-slide-up delay-4 opacity-0">
            {[{ v: "50K+", l: "عميل سعيد" }, { v: "10M+", l: "طلب مكتمل" }, { v: "1,694+", l: "خدمة مفعّلة" }, { v: "24/7", l: "دعم فني" }].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-900 text-white">{s.v}</div>
                <div className="text-gray-500 text-sm mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scrolling Platforms */}
      <div className="relative overflow-hidden border-y border-white/5 bg-dark-800/50 py-4">
        <div className="flex animate-scroll gap-8 whitespace-nowrap">
          {["Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "Telegram", "Snapchat", "Spotify", "Discord", "LinkedIn",
            "Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "Telegram", "Snapchat", "Spotify", "Discord", "LinkedIn"].map((p, i) => (
            <div key={i} className="px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-gray-300 text-sm font-bold shrink-0">{p}</div>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">خدماتنا المميزة</h2>
        <p className="text-center text-gray-500 mb-12">دعم كامل لجميع المنصات التي تحتاجها</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "📘", name: "خدمات فيسبوك", desc: "متابعين، لايكات، مشاهدات، وتفاعل حقيقي لصفحتك." },
            { icon: "📸", name: "خدمات انستجرام", desc: "متابعين، لايكات، مشاهدات ستوري بجودة عالية." },
            { icon: "🎵", name: "خدمات تيك توك", desc: "تصدّر الاكسبلور وزد المشاهدات والمتابعين." },
            { icon: "▶️", name: "خدمات يوتيوب", desc: "ساعات مشاهدة ومشتركين حقيقيين لقناتك." },
          ].map((s, i) => (
            <div key={i} className="card-dark p-6 text-center animate-slide-up opacity-0" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="font-display text-lg font-800 text-white mb-2">{s.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
              <Link href="/auth" className="text-sm font-bold" style={{ color: A }}>اطلب الآن ←</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-12">لماذا تختارنا؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: "⚡", title: "تنفيذ فوري", desc: "نظامنا آلي بالكامل. تبدأ الطلبات في العمل بمجرد الدفع." },
              { emoji: "🎧", title: "دعم فني 24/7", desc: "فريق محترف جاهز للرد على استفساراتك وحل المشاكل." },
              { emoji: "💰", title: "أرخص الأسعار", desc: "أسعار تنافسية تبدأ من $0.001 للموزعين والأفراد." },
            ].map((f, i) => (
              <div key={i} className="card-dark p-7 text-center animate-slide-up opacity-0" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-4">{f.emoji}</div>
                <h3 className="font-display text-xl font-800 text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Table */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">أفضل الأسعار مبيعاً</h2>
        <p className="text-center text-gray-500 mb-10">قارن بين خدماتنا المميزة واختر ما يناسبك</p>
        <div className="card-dark overflow-hidden">
          <div className="grid grid-cols-5 text-sm font-bold py-3 px-4" style={{ background: A }}>
            <div className="text-white">الخدمة</div>
            <div className="text-white text-center">السعر لكل 1000</div>
            <div className="text-white text-center">أقل كمية</div>
            <div className="text-white text-center">السرعة</div>
            <div className="text-white text-center">طلب</div>
          </div>
          {[
            { name: "📸 متابعين انستجرام - ضمان 30 يوم", price: "$0.45", min: "10", speed: "سريع جداً" },
            { name: "🎵 مشاهدات تيك توك - جودة عالية", price: "$0.01", min: "100", speed: "فوري" },
            { name: "▶️ ساعات مشاهدة يوتيوب - حقيقي", price: "$2.10", min: "500", speed: "1000/يوم" },
          ].map((r, i) => (
            <div key={i} className={`grid grid-cols-5 text-sm py-4 px-4 items-center ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
              <div className="text-gray-300">{r.name}</div>
              <div className="text-center font-bold" style={{ color: A }}>{r.price}</div>
              <div className="text-center text-gray-400">{r.min}</div>
              <div className="text-center text-gray-400">{r.speed}</div>
              <div className="text-center">
                <Link href="/auth" className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: A }}>اطلب</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl font-900 text-center text-white mb-3">ماذا يقولون عن {STORE.name}؟</h2>
        <p className="text-center text-gray-500 mb-12">نفتخر بخدمة أكثر من 50 ألف عميل حول العالم</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "أحمد محمد", role: "صاحب متجر إلكتروني", text: "خدمة ممتازة وسريعة. أسعار لا تُقارن وضمان حقيقي!" },
            { name: "سارة خالد", role: "صانعة محتوى", text: "الأسعار هنا خيالية مقارنة بالجودة. شكراً لفريق العمل." },
            { name: "محمد العلي", role: "مسوّق رقمي", text: "أفضل موقع تعاملت معه. الضمان حقيقي والتعويض فوري." },
          ].map((t, i) => (
            <div key={i} className="card-dark p-6" style={{ borderRight: `3px solid ${A}` }}>
              <div className="flex gap-1 mb-3">{[1,2,3,4,5].map((s) => <span key={s} className="text-yellow-400 text-sm">⭐</span>)}</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
              <div className="font-bold text-white text-sm">{t.name}</div>
              <div className="text-gray-500 text-xs">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C}15, transparent)` }}>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-900 text-white mb-4">جاهز تبدأ؟</h2>
          <p className="text-gray-400 mb-8 text-lg">سجّل مجاناً وابدأ بتعزيز تواجدك الرقمي اليوم</p>
          <Link href="/auth" className="inline-block px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105"
            style={{ background: A, boxShadow: `0 0 30px ${A}40` }}>
            سجل الآن مجاناً ←
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-dark-800/50 py-10 text-center">
        <p className="text-gray-600 text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} {STORE.name}</p>
      </footer>
    </div>
  );
}
