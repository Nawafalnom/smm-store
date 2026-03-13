"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, STORE, ORDER_STATUSES, type Profile, type Order, type Category, type Service } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"new_order" | "orders" | "services" | "settings">("new_order");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Order form state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderLink, setOrderLink] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");

  const C = STORE.color;
  const A = STORE.accentColor;

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth"); return; }
    setUser(session.user);
    await Promise.all([fetchProfile(session.user.id), fetchOrders(session.user.id), fetchCategories(), fetchServices()]);
    setLoading(false);
  }

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    if (data) setProfile(data);
  }

  async function fetchOrders(uid: string) {
    const { data } = await supabase.from("orders").select("*, service:services(*)").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
    if (data) setCategories(data);
  }

  async function fetchServices() {
    const { data } = await supabase.from("services").select("*, category:categories(*)").eq("is_active", true).order("sort_order");
    if (data) setServices(data);
  }

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category_id === selectedCategory)
    : services;

  const orderPrice = selectedService && orderQuantity
    ? (selectedService.price_per_1000 / 1000) * Number(orderQuantity)
    : 0;

  async function handlePlaceOrder() {
    if (!selectedService || !orderLink || !orderQuantity) {
      toast.error("الرجاء تعبئة جميع الحقول"); return;
    }
    const qty = Number(orderQuantity);
    if (qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
      toast.error(`الكمية يجب أن تكون بين ${selectedService.min_quantity} و ${selectedService.max_quantity}`); return;
    }
    if (!profile || profile.balance < orderPrice) {
      toast.error("رصيدك غير كافٍ! الرجاء إضافة رصيد"); return;
    }

    try {
      // Deduct balance
      const { error: balErr } = await supabase.from("profiles").update({
        balance: profile.balance - orderPrice,
        total_spent: (profile.total_spent || 0) + orderPrice,
      }).eq("id", user.id);
      if (balErr) throw balErr;

      // Create order
      const { error: ordErr } = await supabase.from("orders").insert({
        user_id: user.id,
        service_id: selectedService.id,
        link: orderLink,
        quantity: qty,
        price: orderPrice,
        status: "pending",
      });
      if (ordErr) throw ordErr;

      toast.success("تم إرسال الطلب بنجاح!");
      setOrderLink("");
      setOrderQuantity("");
      setSelectedService(null);
      await Promise.all([fetchProfile(user.id), fetchOrders(user.id)]);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ في إرسال الطلب");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${C}40`, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const menuItems = [
    { key: "new_order", icon: "🛒", label: "طلب جديد" },
    { key: "orders", icon: "📋", label: "الطلبات" },
    { key: "services", icon: "❤️", label: "الخدمات" },
    { key: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed lg:sticky top-0 right-0 z-50 h-screen w-72 bg-dark-800 border-l border-white/5 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-900"
              style={{ background: `${C}20`, border: `1px solid ${C}40`, color: C }}>G</div>
            <span className="font-display font-800" style={{ color: C }}>Growence</span>
            <span className="font-display font-800 text-white">Media</span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="p-5">
          <div className="rounded-2xl p-4 text-center" style={{ background: `${A}15`, border: `1px solid ${A}30` }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-display font-900 text-white"
              style={{ background: A }}>
              {profile?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="font-bold text-white">{profile?.username || "مستخدم"}</div>
            <div className="text-xs mt-1" style={{ color: A }}>
              المستوى {profile?.level || 1} ({profile?.discount || 0}% خصم)
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="px-3 flex-1">
          <div className="text-gray-600 text-xs font-bold mb-2 px-3">القائمة</div>
          {menuItems.map((item) => (
            <button key={item.key}
              onClick={() => { setActiveView(item.key as any); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-all ${
                activeView === item.key ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
              }`}
              style={activeView === item.key ? { background: `${A}20`, color: A } : {}}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Links */}
        <div className="px-3 pb-3">
          <div className="text-gray-600 text-xs font-bold mb-2 px-3">روابط</div>
          <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition">
            💬 الدعم الفني
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition">
            🚪 تسجيل خروج
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 text-xl">☰</button>
              <span className="text-gray-300 font-bold">أهلاً بك، {profile?.username || "مستخدم"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-lg text-sm font-bold" style={{ background: `${C}15`, color: C }}>
                ${profile?.balance?.toFixed(2) || "0.00"}
              </div>
              <button className="text-xl">🔔</button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* ─── STATS CARDS ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "إجمالي الطلبات", value: orders.length.toLocaleString(), icon: "📊", color: C },
              { label: "إجمالي الإنفاق", value: `$${(profile?.total_spent || 0).toFixed(2)}`, icon: "💵", color: "#10b981" },
              { label: "المستوى الحالي", value: `مستوى ${profile?.level || 1}`, icon: "🏆", color: A },
              { label: "الرصيد المتاح", value: `$${(profile?.balance || 0).toFixed(2)}`, icon: "👁️", color: "#3b82f6" },
            ].map((stat, i) => (
              <div key={i} className="card-dark p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs">{stat.label}</span>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <div className="font-display text-xl font-900" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* ─── NETWORK FILTER (on new_order) ─── */}
          {activeView === "new_order" && (
            <>
              <div className="mb-6">
                <h3 className="text-gray-400 text-sm font-bold mb-3">اختر شبكة اجتماعية</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategory("")}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!selectedCategory ? "text-white" : "text-gray-500 border border-white/10 hover:border-white/20"}`}
                    style={!selectedCategory ? { background: A, color: "white" } : {}}>
                    ••• الكل
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id!)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        selectedCategory === cat.id ? "text-white" : "text-gray-500 border-white/10 hover:border-white/20"
                      }`}
                      style={selectedCategory === cat.id ? { background: `${C}25`, borderColor: `${C}50`, color: C } : {}}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Form */}
                <div className="card-dark p-6">
                  <div className="flex gap-2 mb-5">
                    {["طلب جديد", "الاشتراكات", "المفضلة"].map((tab, i) => (
                      <button key={i} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                        i === 0 ? "text-white" : "text-gray-500"
                      }`} style={i === 0 ? { background: A } : {}}>
                        {i === 0 ? "🛒" : i === 1 ? "💎" : "⭐"} {tab}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {/* Category */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1.5">الفئة</label>
                      <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedService(null); }}
                        className="admin-input">
                        <option value="">اختر فئة...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Service */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1.5">الخدمة</label>
                      <select value={selectedService?.id || ""} onChange={(e) => {
                        const svc = services.find((s) => s.id === e.target.value);
                        setSelectedService(svc || null);
                      }} className="admin-input">
                        <option value="">اختر خدمة...</option>
                        {filteredServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - ${s.price_per_1000} لكل 1000
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Description */}
                    {selectedService && (
                      <div className="rounded-xl p-4 text-sm space-y-1" style={{ background: `${C}08`, border: `1px solid ${C}15` }}>
                        <div className="font-bold text-white mb-2">الوصف</div>
                        {selectedService.description && <p className="text-gray-400">{selectedService.description}</p>}
                        <p className="text-gray-500">⚡ السرعة: {selectedService.speed}</p>
                        {selectedService.guarantee_days > 0 && (
                          <p className="text-gray-500">🔄 ضمان: {selectedService.guarantee_days} يوم</p>
                        )}
                      </div>
                    )}

                    {/* Link */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1.5">الرابط</label>
                      <input type="url" value={orderLink} onChange={(e) => setOrderLink(e.target.value)}
                        placeholder="https://..." className="admin-input" dir="ltr" />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1.5">الكمية</label>
                      <input type="number" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)}
                        placeholder={selectedService ? `${selectedService.min_quantity} - ${selectedService.max_quantity}` : "الكمية"}
                        className="admin-input" dir="ltr" />
                      {selectedService && (
                        <p className="text-gray-600 text-xs mt-1">
                          الحد الأدنى: {selectedService.min_quantity} - الحد الأقصى: {selectedService.max_quantity.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Speed */}
                    {selectedService && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-1.5">متوسط الوقت</label>
                        <div className="admin-input !bg-dark-800 text-gray-400">{selectedService.speed}</div>
                      </div>
                    )}

                    {/* Price */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1.5">التكلفة</label>
                      <div className="admin-input !bg-dark-800 font-display font-bold text-xl" style={{ color: A }} dir="ltr">
                        ${orderPrice.toFixed(4)}
                      </div>
                    </div>

                    {/* Submit */}
                    <button onClick={handlePlaceOrder}
                      className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.01]"
                      style={{ background: A }}>
                      إرسال
                    </button>
                  </div>
                </div>

                {/* Right: Info */}
                <div className="space-y-4">
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">📝 معلومات مهمة</h4>
                    <ul className="text-gray-500 text-sm space-y-2">
                      <li>• الخدمات حالياً مكتوبة على هذا التنسيق:</li>
                      <li className="font-bold text-gray-300">اسم الخدمة [الحد الأعلى] [وقت البدء - السرعة]</li>
                      <li>• تبدأ سرعة التوصيل بعد وقت البدء الموجود بالوصف.</li>
                      <li>🟡 = أفضل الخدمات.</li>
                      <li>🔵 = خاصية تجزئة الطلب مفعلة.</li>
                      <li>⚙️ = زر التعويض مفعل.</li>
                      <li>🚫 = زر الإلغاء مفعل.</li>
                    </ul>
                  </div>
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">⚠️ تحذير هام</h4>
                    <ul className="text-gray-500 text-sm space-y-2">
                      <li>🟡 تحقق من تنسيق الرابط بدقة قبل تقديم الطلب.</li>
                      <li>🟡 تأكد من أن حسابك عام وليس خاص.</li>
                      <li>⚙️ عند ازدحام الخدمة، قد تتغير سرعة البدء.</li>
                      <li>🚫 لا تقدم طلباً ثانياً لنفس الرابط قبل اكتمال السابق.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── ORDERS VIEW ─── */}
          {activeView === "orders" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">طلباتي ({orders.length})</h2>
              {orders.length === 0 ? (
                <div className="card-dark p-12 text-center">
                  <p className="text-gray-500">لا توجد طلبات بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500">
                        <th className="py-3 px-3 text-right">رقم</th>
                        <th className="py-3 px-3 text-right">الخدمة</th>
                        <th className="py-3 px-3 text-right">الرابط</th>
                        <th className="py-3 px-3 text-right">الكمية</th>
                        <th className="py-3 px-3 text-right">السعر</th>
                        <th className="py-3 px-3 text-right">الحالة</th>
                        <th className="py-3 px-3 text-right">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                        return (
                          <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 px-3 text-gray-500 text-xs font-mono">{o.id?.slice(0, 8)}</td>
                            <td className="py-3 px-3 text-gray-300">{(o as any).service?.name || "-"}</td>
                            <td className="py-3 px-3 text-gray-500 text-xs max-w-[150px] truncate" dir="ltr">{o.link}</td>
                            <td className="py-3 px-3 text-white font-bold">{o.quantity.toLocaleString()}</td>
                            <td className="py-3 px-3 font-bold" style={{ color: C }}>${o.price.toFixed(2)}</td>
                            <td className="py-3 px-3">
                              <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: `${st.color}20`, color: st.color }}>
                                {st.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-500 text-xs">{new Date(o.created_at!).toLocaleDateString("ar-EG")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── SERVICES VIEW ─── */}
          {activeView === "services" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">جميع الخدمات ({services.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500">
                      <th className="py-3 px-3 text-right">الخدمة</th>
                      <th className="py-3 px-3 text-right">السعر/1000</th>
                      <th className="py-3 px-3 text-right">أقل كمية</th>
                      <th className="py-3 px-3 text-right">السرعة</th>
                      <th className="py-3 px-3 text-right">ضمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-3 text-gray-300">{s.name}</td>
                        <td className="py-3 px-3 font-bold" style={{ color: A }}>${s.price_per_1000}</td>
                        <td className="py-3 px-3 text-gray-400">{s.min_quantity}</td>
                        <td className="py-3 px-3 text-gray-400">{s.speed}</td>
                        <td className="py-3 px-3 text-gray-400">{s.guarantee_days > 0 ? `${s.guarantee_days} يوم` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── SETTINGS VIEW ─── */}
          {activeView === "settings" && (
            <div className="max-w-lg">
              <h2 className="text-xl font-bold text-white mb-4">إعدادات الحساب</h2>
              <div className="card-dark p-6 space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">اسم المستخدم</label>
                  <input type="text" value={profile?.username || ""} className="admin-input" readOnly dir="ltr" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">البريد الإلكتروني</label>
                  <input type="email" value={user?.email || ""} className="admin-input" readOnly dir="ltr" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">المستوى</label>
                  <div className="admin-input !bg-dark-800">المستوى {profile?.level || 1} — خصم {profile?.discount || 0}%</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">تاريخ التسجيل</label>
                  <div className="admin-input !bg-dark-800">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ar-EG") : "-"}</div>
                </div>
                <div className="pt-2">
                  <p className="text-gray-600 text-sm">لتغيير كلمة المرور أو بيانات الحساب، تواصل مع الدعم الفني.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
