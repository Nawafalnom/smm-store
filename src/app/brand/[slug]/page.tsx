"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, getBrand, BRANDS, CURRENCIES, type Package, type Brand } from "@/lib/supabase";
import FacebookPixel, { trackEvent } from "@/components/FacebookPixel";
import toast from "react-hot-toast";

export default function BrandPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const brand = getBrand(slug)!;

  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("الكل");
  const [currency, setCurrency] = useState("SYP");
  const [orderModal, setOrderModal] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    account: "",
  });

  useEffect(() => {
    if (!brand) return;
    // Set CSS vars for brand color
    document.documentElement.style.setProperty("--brand-color", brand.color);
    document.documentElement.style.setProperty("--brand-rgb", brand.colorRgb);
    fetchPackages();
  }, [brand]);

  async function fetchPackages() {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("brand_slug", slug)
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

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-400 mb-4">البراند غير موجود</h1>
          <Link href="/" className="text-blue-400 hover:underline">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const platforms = ["الكل", ...Array.from(new Set(packages.map((p) => p.platform)))];
  const filtered = selectedPlatform === "الكل"
    ? packages
    : packages.filter((p) => p.platform === selectedPlatform);

  const currInfo = CURRENCIES[currency];
  const priceKey = currInfo.key;

  function getPrice(pkg: Package): number {
    return (pkg as any)[priceKey] || 0;
  }

  function formatPrice(amount: number): string {
    return amount.toLocaleString("ar-EG") + " " + currInfo.symbol;
  }

  async function handleOrder(pkg: Package) {
    if (!formData.name || !formData.phone || !formData.account) {
      toast.error("الرجاء تعبئة جميع الحقول");
      return;
    }

    const price = getPrice(pkg);

    // Track Lead event
    trackEvent("Lead", {
      content_name: `${pkg.platform} - ${pkg.service}`,
      content_category: brand.name,
      value: price,
      currency: currency,
    });

    // Save order to Supabase
    try {
      const { error } = await supabase.from("orders").insert({
        brand_slug: slug,
        package_id: pkg.id,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_account: formData.account,
        currency: currency,
        total_price: price,
        status: "pending",
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error saving order:", err);
    }

    // Track Purchase event
    trackEvent("Purchase", {
      content_name: `${pkg.platform} - ${pkg.service}`,
      content_category: brand.name,
      value: price,
      currency: currency,
    });

    // Build WhatsApp message
    const msg = encodeURIComponent(
      `🛒 طلب جديد - ${brand.name}\n` +
      `━━━━━━━━━━━━━━\n` +
      `📦 الخدمة: ${pkg.service}\n` +
      `📱 المنصة: ${pkg.platform}\n` +
      `🔢 الكمية: ${pkg.quantity}\n` +
      `💰 السعر: ${formatPrice(price)}\n` +
      `━━━━━━━━━━━━━━\n` +
      `👤 الاسم: ${formData.name}\n` +
      `📞 الهاتف: ${formData.phone}\n` +
      `🔗 الحساب: ${formData.account}`
    );

    const waNum = brand.whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${waNum}?text=${msg}`, "_blank");

    // Reset
    setOrderModal(null);
    setFormData({ name: "", phone: "", account: "" });
    toast.success("تم إرسال الطلب بنجاح!");
  }

  return (
    <div className="min-h-screen bg-dark-900 bg-grid" style={{ "--brand-color": brand.color, "--brand-rgb": brand.colorRgb } as any}>
      <FacebookPixel pixelId={brand.pixel} />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-200 transition text-sm">
            ← كل البراندات
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-display font-800 text-lg" style={{ color: brand.color }}>
              {brand.name}
            </span>
          </div>
          {/* Currency Selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="admin-input !w-auto !py-2 !px-3 text-sm"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>{info.symbol} {info.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Brand Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center">
          <div
            className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center animate-pulse-glow"
            style={{
              background: `linear-gradient(135deg, ${brand.color}25, ${brand.color}08)`,
              border: `2px solid ${brand.color}50`,
            }}
          >
            <span className="text-4xl font-display font-900" style={{ color: brand.color }}>
              {brand.name.charAt(0)}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-900 neon-text mb-2" style={{ color: brand.color }}>
            {brand.name}
          </h1>
          <p className="text-gray-400 text-lg mb-2">{brand.nameAr}</p>
          <p className="text-gray-500 max-w-lg mx-auto">{brand.description}</p>
        </div>
      </div>

      {/* Platform Filter */}
      {platforms.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`platform-badge ${selectedPlatform === p ? "active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Packages */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="text-center py-20">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: `${brand.color}40`, borderTopColor: "transparent" }}
            />
            <p className="text-gray-500">جاري تحميل الباقات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">لا توجد باقات حالياً</p>
            <p className="text-gray-600 text-sm mt-2">تواصل معنا على الواتساب للاستفسار</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((pkg, i) => (
              <div
                key={pkg.id}
                className="card-dark p-6 flex flex-col animate-slide-up opacity-0"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Platform & Service */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: `${brand.color}15`,
                      color: brand.color,
                      border: `1px solid ${brand.color}30`,
                    }}
                  >
                    {pkg.platform}
                  </span>
                  <span className="text-gray-500 text-sm">{pkg.service}</span>
                </div>

                {/* Quantity */}
                <h3 className="font-display text-2xl font-800 mb-1 text-white">
                  {pkg.quantity}
                </h3>
                <p className="text-gray-500 text-sm mb-4">{pkg.service}</p>

                {/* Price */}
                <div className="mt-auto">
                  <div
                    className="text-3xl font-display font-900 mb-4"
                    style={{ color: brand.color }}
                  >
                    {formatPrice(getPrice(pkg))}
                  </div>
                  <button
                    onClick={() => {
                      setOrderModal(pkg);
                      trackEvent("Lead", {
                        content_name: `${pkg.platform} - ${pkg.service}`,
                        content_category: brand.name,
                      });
                    }}
                    className="neon-btn w-full py-3 rounded-xl font-bold text-base"
                  >
                    🛒 اطلب الآن
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Float Button */}
      <a
        href={`https://wa.me/${brand.whatsapp.replace(/[^0-9]/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOrderModal(null)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 animate-slide-up"
            style={{
              background: "linear-gradient(145deg, #12121a, #1a1a28)",
              border: `1px solid ${brand.color}30`,
            }}
          >
            <button
              onClick={() => setOrderModal(null)}
              className="absolute top-4 left-4 text-gray-500 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="font-display text-xl font-800 mb-1" style={{ color: brand.color }}>
              تأكيد الطلب
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              {orderModal.platform} • {orderModal.service} • {orderModal.quantity}
            </p>

            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: `${brand.color}08`, border: `1px solid ${brand.color}20` }}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-400">المبلغ</span>
                <span className="font-display text-2xl font-800" style={{ color: brand.color }}>
                  {formatPrice(getPrice(orderModal))}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="admin-input"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف / واتساب"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="admin-input"
                dir="ltr"
              />
              <input
                type="text"
                placeholder="رابط أو اسم الحساب المستهدف"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                className="admin-input"
              />
            </div>

            <button
              onClick={() => handleOrder(orderModal)}
              className="neon-btn w-full py-3.5 rounded-xl font-bold text-lg"
            >
              📱 إرسال الطلب عبر واتساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
