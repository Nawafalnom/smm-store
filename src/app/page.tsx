"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase, STORE, CURRENCIES, type Package } from "@/lib/supabase";
import FacebookPixel, { trackEvent } from "@/components/FacebookPixel";
import toast from "react-hot-toast";

/* ───── Platform Icons (SVG inline) ───── */
const PlatformIcon = ({ name, size = 28 }: { name: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.2V11.2a4.85 4.85 0 01-3.77-1.74V6.69h3.77z" />
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    twitter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    telegram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    snapchat: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.856-.218.09-.045.18-.075.27-.075.12 0 .24.045.33.12.12.09.18.24.18.36 0 .15-.075.315-.24.39-.195.12-.57.27-1.151.36-.18.03-.33.06-.45.09-.15.03-.24.06-.27.075-.03.03-.06.06-.06.12v.15c-.09.63-.54 1.26-1.29 1.77-.63.42-1.32.69-1.89.87.12.24.36.66.75 1.14.39.48.87.99 1.5 1.35.24.15.48.24.75.33.24.06.42.18.42.39 0 .18-.18.36-.39.42-.15.03-.33.06-.51.06-.42 0-.99-.12-1.59-.36-.33-.12-.66-.3-.99-.54-.24-.15-.48-.36-.72-.57-.12-.12-.24-.18-.36-.18s-.24.06-.33.12c-.45.36-.96.63-1.47.84-.78.3-1.53.42-2.01.42-.48 0-1.23-.12-2.01-.42-.51-.21-1.02-.48-1.47-.84-.09-.06-.21-.12-.33-.12s-.24.06-.36.18c-.24.21-.48.42-.72.57-.33.24-.66.42-.99.54-.6.24-1.17.36-1.59.36-.18 0-.36-.03-.51-.06-.21-.06-.39-.24-.39-.42 0-.21.18-.33.42-.39.27-.09.51-.18.75-.33.63-.36 1.11-.87 1.5-1.35.39-.48.63-.9.75-1.14-.57-.18-1.26-.45-1.89-.87-.75-.51-1.2-1.14-1.29-1.77v-.15c0-.06-.03-.09-.06-.12-.03-.015-.12-.045-.27-.075-.12-.03-.27-.06-.45-.09-.57-.09-.96-.24-1.15-.36-.165-.075-.24-.24-.24-.39 0-.12.06-.27.18-.36.09-.075.21-.12.33-.12.09 0 .18.03.27.075.197.098.556.202.856.218.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C5.653 1.069 9.01.793 10 .793h2.206z" />
      </svg>
    ),
    spotify: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ───── Scrolling Platforms Bar ───── */
const platformsList = [
  { name: "instagram", label: "Instagram", color: "#E4405F" },
  { name: "tiktok", label: "TikTok", color: "#ffffff" },
  { name: "youtube", label: "YouTube", color: "#FF0000" },
  { name: "facebook", label: "Facebook", color: "#1877F2" },
  { name: "twitter", label: "Twitter", color: "#ffffff" },
  { name: "telegram", label: "Telegram", color: "#26A5E4" },
  { name: "snapchat", label: "Snapchat", color: "#FFFC00" },
  { name: "spotify", label: "Spotify", color: "#1DB954" },
];

/* ───── Main Page ───── */
export default function LandingPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("الكل");
  const [currency, setCurrency] = useState("SYP");
  const [orderModal, setOrderModal] = useState<Package | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", account: "" });
  const packagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", STORE.color);
    document.documentElement.style.setProperty("--brand-rgb", STORE.colorRgb);
    fetchPackages();
  }, []);

  async function fetchPackages() {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error("Error fetching packages:", err);
    } finally {
      setLoading(false);
    }
  }

  const platforms = ["الكل", ...Array.from(new Set(packages.map((p) => p.platform)))];
  const filtered = selectedPlatform === "الكل" ? packages : packages.filter((p) => p.platform === selectedPlatform);
  const currInfo = CURRENCIES[currency];
  const priceKey = currInfo.key;
  function getPrice(pkg: Package): number { return (pkg as any)[priceKey] || 0; }
  function formatPrice(amount: number): string { return amount.toLocaleString("ar-EG") + " " + currInfo.symbol; }

  function scrollToPackages() {
    packagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleOrder(pkg: Package) {
    if (!formData.name || !formData.phone || !formData.account) {
      toast.error("الرجاء تعبئة جميع الحقول");
      return;
    }
    const price = getPrice(pkg);
    trackEvent("Lead", { content_name: `${pkg.platform} - ${pkg.service}`, content_category: STORE.name, value: price, currency });

    try {
      await supabase.from("orders").insert({
        package_id: pkg.id, customer_name: formData.name, customer_phone: formData.phone,
        customer_account: formData.account, currency, total_price: price, status: "pending",
      });
    } catch (err) { console.error(err); }

    trackEvent("Purchase", { content_name: `${pkg.platform} - ${pkg.service}`, content_category: STORE.name, value: price, currency });

    const msg = encodeURIComponent(
      `🛒 طلب جديد - ${STORE.name}\n━━━━━━━━━━━━━━\n📦 الخدمة: ${pkg.service}\n📱 المنصة: ${pkg.platform}\n🔢 الكمية: ${pkg.quantity}\n💰 السعر: ${formatPrice(price)}\n━━━━━━━━━━━━━━\n👤 الاسم: ${formData.name}\n📞 الهاتف: ${formData.phone}\n🔗 الحساب: ${formData.account}`
    );
    window.open(`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
    setOrderModal(null);
    setFormData({ name: "", phone: "", account: "" });
    toast.success("تم إرسال الطلب بنجاح!");
  }

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": STORE.color, "--brand-rgb": STORE.colorRgb } as any}>
      {STORE.pixel && <FacebookPixel pixelId={STORE.pixel} />}

      {/* ════════ NAVBAR ════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-900 text-lg"
              style={{ background: `${STORE.color}20`, border: `1px solid ${STORE.color}40`, color: STORE.color }}>
              G
            </div>
            <span className="font-display font-800 text-xl" style={{ color: STORE.color }}>Growence</span>
            <span className="font-display font-800 text-xl text-white">Media</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#services" className="hover:text-white transition">الخدمات</a>
            <a href="#features" className="hover:text-white transition">المميزات</a>
            <a href="#packages" className="hover:text-white transition">الباقات</a>
            <a href="#testimonials" className="hover:text-white transition">آراء العملاء</a>
          </div>
          <button onClick={scrollToPackages}
            className="neon-btn px-5 py-2 rounded-xl font-bold text-sm">
            اطلب الآن ←
          </button>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-radial" />
        <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: STORE.color }} />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full opacity-8 blur-[120px]" style={{ background: "#ff4d00" }} />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="px-5 py-2 rounded-full text-sm font-bold animate-slide-up"
              style={{ background: `${STORE.color}15`, border: `1px solid ${STORE.color}30`, color: STORE.color }}>
              🚀 المنصة رقم 1 لخدمات التسويق الإلكتروني
            </div>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-900 text-center leading-tight mb-6 animate-slide-up delay-1 opacity-0">
            <span className="text-white">عزّز وجودك الرقمي مع</span>
            <br />
            <span className="neon-text" style={{ color: STORE.color }}>Growence Media</span>
          </h1>

          <p className="text-center text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-slide-up delay-2 opacity-0">
            نقدم لك أسرع وأرخص خدمات التسويق الإلكتروني. زيادة متابعين، لايكات، ومشاهدات لجميع منصات التواصل الاجتماعي بجودة عالية وضمان حقيقي.
          </p>

          <div className="flex justify-center gap-4 mb-16 animate-slide-up delay-3 opacity-0">
            <button onClick={scrollToPackages}
              className="px-8 py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${STORE.color}, ${STORE.color}cc)`, boxShadow: `0 0 30px ${STORE.color}40` }}>
              تصفّح الباقات ←
            </button>
            <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank"
              className="px-8 py-3.5 rounded-xl font-bold text-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-all">
              تواصل معنا
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 animate-slide-up delay-4 opacity-0">
            {[
              { value: "50K+", label: "عميل سعيد" },
              { value: "10M+", label: "طلب مكتمل" },
              { value: "1,694+", label: "خدمة مفعّلة" },
              { value: "24/7", label: "دعم فني" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-900 text-white">{s.value}</div>
                <div className="text-gray-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ SCROLLING PLATFORMS BAR ════════ */}
      <div className="relative overflow-hidden border-y border-white/5 bg-dark-800/50 py-4">
        <div className="flex animate-scroll gap-8 whitespace-nowrap">
          {[...platformsList, ...platformsList, ...platformsList].map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] shrink-0">
              <span style={{ color: p.color }}><PlatformIcon name={p.name} size={20} /></span>
              <span className="text-gray-300 text-sm font-bold">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ SERVICES ════════ */}
      <section id="services" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">خدماتنا المميزة</h2>
        <p className="text-center text-gray-500 mb-12">دعم كامل لجميع المنصات التي تحتاجها</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "facebook", name: "خدمات فيسبوك", desc: "متابعين، لايكات، مشاهدات، وتفاعل حقيقي لصفحتك ومنشوراتك.", color: "#1877F2" },
            { icon: "instagram", name: "خدمات انستجرام", desc: "متابعين، لايكات، مشاهدات ستوري بجودة عالية وضمان تعويض.", color: "#E4405F" },
            { icon: "tiktok", name: "خدمات تيك توك", desc: "تصدّر الاكسبلور وزد عدد المشاهدات والمتابعين بسرعة خيالية.", color: "#ffffff" },
            { icon: "youtube", name: "خدمات يوتيوب", desc: "ساعات مشاهدة لتحقيق الدخل ومشتركين حقيقيين لقناتك.", color: "#FF0000" },
            { icon: "twitter", name: "خدمات تويتر", desc: "متابعين، ريتويت، لايكات ومشاهدات لتويتاتك.", color: "#ffffff" },
            { icon: "telegram", name: "خدمات تيليجرام", desc: "أعضاء، مشاهدات وتفاعل لقنواتك ومجموعاتك.", color: "#26A5E4" },
            { icon: "snapchat", name: "خدمات سناب شات", desc: "متابعين ومشاهدات لحسابك على سناب شات.", color: "#FFFC00" },
            { icon: "spotify", name: "خدمات سبوتيفاي", desc: "مستمعين، متابعين وتشغيلات لأغانيك وبودكاستك.", color: "#1DB954" },
          ].map((svc, i) => (
            <div key={i} className="card-dark p-6 text-center group cursor-pointer animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${svc.color}12`, border: `1px solid ${svc.color}25` }}>
                <span style={{ color: svc.color }}><PlatformIcon name={svc.icon} size={30} /></span>
              </div>
              <h3 className="font-display text-lg font-800 text-white mb-2">{svc.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{svc.desc}</p>
              <button onClick={scrollToPackages} className="text-sm font-bold transition-colors" style={{ color: STORE.color }}>
                اطلب الآن ←
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="features" className="relative">
        <div className="absolute inset-0 bg-dark-800/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">لماذا تختارنا؟</h2>
          <p className="text-center text-gray-500 mb-12">نتميّز عن غيرنا بخدمات استثنائية</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: "⚡", title: "تنفيذ فوري", desc: "نظامنا آلي بالكامل. تبدأ الطلبات في العمل بمجرد التأكيد." },
              { emoji: "🎧", title: "دعم فني 24/7", desc: "فريق محترف جاهز للرد على استفساراتك وحل المشاكل بأسرع وقت." },
              { emoji: "💰", title: "أرخص الأسعار", desc: "أسعار تنافسية لا تُقارن مع جودة عالية وضمان حقيقي على جميع الخدمات." },
              { emoji: "🔒", title: "أمان وخصوصية", desc: "لا نحتاج كلمات مرور حساباتك. خدماتنا آمنة 100% على حسابك." },
              { emoji: "🔄", title: "ضمان التعويض", desc: "نقص بالمتابعين؟ نعوّضك تلقائياً. ضمان مستمر على جميع الخدمات." },
              { emoji: "🌍", title: "دعم عملات متعددة", desc: "ادفع بالليرة السورية، الجنيه المصري، الدولار أو الريال السعودي." },
            ].map((f, i) => (
              <div key={i} className="card-dark p-7 text-center animate-slide-up opacity-0"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-4">{f.emoji}</div>
                <h3 className="font-display text-xl font-800 text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">ابدأ بـ 3 خطوات بسيطة</h2>
        <p className="text-center text-gray-500 mb-12">طريقة الطلب سهلة وسريعة جداً</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "اختر الخدمة", desc: "تصفّح الباقات واختر المنصة والخدمة المناسبة لك." },
            { step: "02", title: "أدخل بياناتك", desc: "أدخل رابط حسابك أو المنشور المستهدف وبيانات التواصل." },
            { step: "03", title: "استلم الطلب", desc: "يبدأ التنفيذ فوراً وتستلم طلبك خلال وقت قصير." },
          ].map((s, i) => (
            <div key={i} className="text-center animate-slide-up opacity-0" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="font-display text-6xl font-900 mb-4" style={{ color: `${STORE.color}30` }}>{s.step}</div>
              <h3 className="font-display text-xl font-800 text-white mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ PACKAGES ════════ */}
      <section id="packages" ref={packagesRef} className="relative">
        <div className="absolute inset-0 bg-dark-800/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">الباقات والأسعار</h2>
          <p className="text-center text-gray-500 mb-4">اختر الباقة المناسبة لك</p>

          {/* Currency */}
          <div className="flex justify-center mb-8">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="admin-input !w-auto !py-2 !px-4 text-sm">
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>{info.symbol} {info.label}</option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          {platforms.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {platforms.map((p) => (
                <button key={p} onClick={() => setSelectedPlatform(p)}
                  className={`platform-badge ${selectedPlatform === p ? "active" : ""}`}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: `${STORE.color}40`, borderTopColor: "transparent" }} />
              <p className="text-gray-500">جاري تحميل الباقات...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 opacity-30">📦</div>
              <p className="text-gray-500 text-lg">لا توجد باقات حالياً</p>
              <p className="text-gray-600 text-sm mt-2">تواصل معنا على الواتساب للاستفسار</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((pkg, i) => (
                <div key={pkg.id} className="card-dark p-6 flex flex-col animate-slide-up opacity-0"
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: `${STORE.color}15`, color: STORE.color, border: `1px solid ${STORE.color}30` }}>
                      {pkg.platform}
                    </span>
                    <span className="text-gray-500 text-sm">{pkg.service}</span>
                  </div>
                  <h3 className="font-display text-2xl font-800 mb-1 text-white">{pkg.quantity}</h3>
                  <p className="text-gray-500 text-sm mb-4">{pkg.service}</p>
                  <div className="mt-auto">
                    <div className="text-3xl font-display font-900 mb-4" style={{ color: STORE.color }}>
                      {formatPrice(getPrice(pkg))}
                    </div>
                    <button onClick={() => { setOrderModal(pkg); trackEvent("Lead", { content_name: `${pkg.platform} - ${pkg.service}`, content_category: STORE.name }); }}
                      className="neon-btn w-full py-3 rounded-xl font-bold text-base">
                      🛒 اطلب الآن
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════ TESTIMONIALS ════════ */}
      <section id="testimonials" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-900 text-center text-white mb-3">
          ماذا يقولون عن {STORE.name}؟
        </h2>
        <p className="text-center text-gray-500 mb-12">نفتخر بخدمة آلاف العملاء حول العالم</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "أحمد محمد", role: "صاحب متجر إلكتروني", text: "خدمة ممتازة وسريعة جداً. طلبت متابعين انستجرام ووصلوا خلال ساعة. أسعار لا تُقارن!" },
            { name: "سارة خالد", role: "صانعة محتوى", text: "الأسعار هنا خيالية مقارنة بالجودة. شكراً لفريق العمل على الدعم السريع والاحترافي." },
            { name: "محمد العلي", role: "مسوّق رقمي", text: "أفضل موقع تعاملت معه. الضمان حقيقي والتعويض فوري. أنصح الجميع بتجربتهم." },
            { name: "نور حسن", role: "يوتيوبر", text: "ساعات المشاهدة وصلت بسرعة وحققت شروط الدخل. شكراً Growence Media!" },
            { name: "ليلى عمران", role: "مديرة سوشال ميديا", text: "نستخدمهم لكل عملائنا. الجودة ثابتة والأسعار تنافسية. شريك موثوق 100%." },
            { name: "عمر ياسين", role: "صاحب قناة تيليجرام", text: "أعضاء حقيقيين ومتفاعلين. أفضل خدمة تيليجرام جربتها. مستمر معكم!" },
          ].map((t, i) => (
            <div key={i} className="card-dark p-6 animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.1}s`, borderRight: `3px solid ${STORE.color}` }}>
              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-yellow-400 text-sm">⭐</span>
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
              <div>
                <div className="font-bold text-white text-sm">{t.name}</div>
                <div className="text-gray-500 text-xs">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${STORE.color}15, transparent)` }} />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-900 text-white mb-4">
            جاهز تبدأ؟ اطلب الآن!
          </h2>
          <p className="text-gray-400 mb-8 text-lg">انضم لآلاف العملاء السعداء وابدأ بتعزيز تواجدك الرقمي اليوم</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={scrollToPackages}
              className="px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${STORE.color}, ${STORE.color}cc)`, boxShadow: `0 0 30px ${STORE.color}40` }}>
              تصفّح الباقات ←
            </button>
            <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank"
              className="px-10 py-4 rounded-xl font-bold text-lg bg-green-600 text-white hover:bg-green-500 transition-all hover:scale-105 flex items-center gap-2">
              📱 تواصل واتساب
            </a>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="border-t border-white/5 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-900"
                style={{ background: `${STORE.color}20`, color: STORE.color }}>G</div>
              <span className="font-display font-800" style={{ color: STORE.color }}>Growence Media</span>
            </div>
            <p className="text-gray-600 text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} {STORE.name}</p>
            <div className="flex gap-4">
              {platformsList.slice(0, 4).map((p) => (
                <span key={p.name} className="text-gray-600 hover:text-gray-300 transition cursor-pointer">
                  <PlatformIcon name={p.name} size={18} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ════════ WHATSAPP FLOAT ════════ */}
      <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* ════════ ORDER MODAL ════════ */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOrderModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 animate-slide-up"
            style={{ background: "linear-gradient(145deg, #12121a, #1a1a28)", border: `1px solid ${STORE.color}30` }}>
            <button onClick={() => setOrderModal(null)} className="absolute top-4 left-4 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="font-display text-xl font-800 mb-1" style={{ color: STORE.color }}>تأكيد الطلب</h2>
            <p className="text-gray-500 text-sm mb-5">{orderModal.platform} • {orderModal.service} • {orderModal.quantity}</p>
            <div className="rounded-xl p-4 mb-5" style={{ background: `${STORE.color}08`, border: `1px solid ${STORE.color}20` }}>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">المبلغ</span>
                <span className="font-display text-2xl font-800" style={{ color: STORE.color }}>{formatPrice(getPrice(orderModal))}</span>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <input type="text" placeholder="الاسم الكامل" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="admin-input" />
              <input type="tel" placeholder="رقم الهاتف / واتساب" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="admin-input" dir="ltr" />
              <input type="text" placeholder="رابط أو اسم الحساب المستهدف" value={formData.account} onChange={(e) => setFormData({ ...formData, account: e.target.value })} className="admin-input" />
            </div>
            <button onClick={() => handleOrder(orderModal)} className="neon-btn w-full py-3.5 rounded-xl font-bold text-lg">
              📱 إرسال الطلب عبر واتساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
