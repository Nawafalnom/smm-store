"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, STORE, ORDER_STATUSES, type Profile, type Order, type Category, type Service } from "@/lib/supabase";
import { placeProviderOrder, cancelOrders, refillOrder } from "@/lib/smm-api";
import toast from "react-hot-toast";

const A = STORE.accentColor;
const C = STORE.color;

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

  // ── New Order State ──
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderLink, setOrderLink] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");

  useEffect(() => { checkAuth(); }, []);

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
    const { data } = await supabase.from("orders").select("*, service:services(*, provider:providers(id))").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data);
  }
  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
    if (data) setCategories(data);
  }
  async function fetchServices() {
    const { data } = await supabase.from("services").select("*, category:categories(*), provider:providers(id, name)").eq("is_active", true).order("sort_order");
    if (data) setServices(data);
  }

  // ── Filtered categories for the platform bar (only categories that have services) ──
  const activeCats = useMemo(() => {
    const catIds = new Set(services.map(s => s.category_id));
    return categories.filter(c => catIds.has(c.id!));
  }, [categories, services]);

  // ── Filtered services for category dropdown ──
  const filteredByPlatform = useMemo(() => {
    let list = services;
    if (filterCat !== "all") list = list.filter(s => s.category_id === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s as any).category?.name?.toLowerCase().includes(q));
    }
    return list;
  }, [services, filterCat, searchQuery]);

  // ── Categories that appear in filtered results ──
  const filteredCats = useMemo(() => {
    const ids = new Set(filteredByPlatform.map(s => s.category_id));
    return categories.filter(c => ids.has(c.id!));
  }, [filteredByPlatform, categories]);

  // ── Services for the selected category in the form dropdown ──
  const servicesInSelectedCat = useMemo(() => {
    if (!selectedCatId) return [];
    return filteredByPlatform.filter(s => s.category_id === selectedCatId);
  }, [filteredByPlatform, selectedCatId]);

  const orderPrice = selectedService && orderQuantity
    ? (selectedService.price_per_1000 / 1000) * Number(orderQuantity) : 0;

  async function handlePlaceOrder() {
    if (!selectedService || !orderLink || !orderQuantity) { toast.error("الرجاء تعبئة جميع الحقول"); return; }
    const qty = Number(orderQuantity);
    if (qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
      toast.error(`الكمية يجب أن تكون بين ${selectedService.min_quantity} و ${selectedService.max_quantity}`); return;
    }
    if (!profile || profile.balance < orderPrice) { toast.error("رصيدك غير كافٍ!"); return; }

    try {
      const apiResult = await placeProviderOrder(selectedService.provider_id, selectedService.api_service_id, orderLink, qty);
      if (apiResult.error) { toast.error(`خطأ: ${apiResult.error}`); return; }

      await supabase.from("profiles").update({ balance: profile.balance - orderPrice, total_spent: (profile.total_spent || 0) + orderPrice }).eq("id", user.id);
      await supabase.from("orders").insert({ user_id: user.id, service_id: selectedService.id, api_order_id: String(apiResult.order || ""), link: orderLink, quantity: qty, price: orderPrice, status: "pending", start_count: 0, remains: qty });

      toast.success("تم إرسال الطلب بنجاح!");
      setOrderLink(""); setOrderQuantity(""); setSelectedService(null);
      await Promise.all([fetchProfile(user.id), fetchOrders(user.id)]);
    } catch (err) { console.error(err); toast.error("حدث خطأ"); }
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/auth"); }

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${C}40`, borderTopColor: "transparent" }} />
    </div>
  );

  const menuItems = [
    { key: "new_order", icon: "🛒", label: "طلب جديد" },
    { key: "orders", icon: "📋", label: "الطلبات" },
    { key: "services", icon: "❤️", label: "الخدمات" },
    { key: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed lg:sticky top-0 right-0 z-50 h-screen w-64 bg-dark-800 border-l border-white/5 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="p-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-900 text-sm" style={{ background: `${C}20`, border: `1px solid ${C}40`, color: C }}>G</div>
            <span className="font-display font-800 text-sm" style={{ color: C }}>Growence</span>
            <span className="font-display font-800 text-sm text-white">Media</span>
          </Link>
        </div>
        <div className="p-4">
          <div className="rounded-xl p-3 text-center" style={{ background: `${A}12`, border: `1px solid ${A}25` }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-display font-900 text-white" style={{ background: A }}>
              {profile?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="font-bold text-white text-sm">{profile?.username}</div>
            <div className="text-xs mt-1" style={{ color: A }}>المستوى {profile?.level || 1} ({profile?.discount || 0}% خصم)</div>
          </div>
        </div>
        <nav className="px-2 flex-1">
          {menuItems.map((item) => (
            <button key={item.key} onClick={() => { setActiveView(item.key as any); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-bold transition-all ${activeView === item.key ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"}`}
              style={activeView === item.key ? { background: `${A}20`, color: A } : {}}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-2 pb-3 space-y-0.5">
          <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition">💬 الدعم</a>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition">🚪 خروج</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 text-xl">☰</button>
              <span className="text-gray-300 font-bold text-sm">أهلاً، {profile?.username}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: `${C}15`, color: C }}>${profile?.balance?.toFixed(2) || "0.00"}</div>
              <button className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition" onClick={() => toast("تواصل مع الدعم لشحن الرصيد")}>+ إضافة رصيد</button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* ═══════ STATS ═══════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: "إجمالي الطلبات", value: orders.length.toLocaleString(), icon: "📊", color: C },
              { label: "إجمالي الإنفاق", value: `$${(profile?.total_spent || 0).toFixed(2)}`, icon: "💵", color: "#10b981" },
              { label: "المستوى", value: `مستوى ${profile?.level || 1}`, icon: "🏆", color: A },
              { label: "الرصيد", value: `$${(profile?.balance || 0).toFixed(2)}`, icon: "👁️", color: "#3b82f6" },
            ].map((s, i) => (
              <div key={i} className="card-dark p-4">
                <div className="flex items-center justify-between mb-1"><span className="text-gray-500 text-xs">{s.label}</span><span>{s.icon}</span></div>
                <div className="font-display text-lg font-900" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ═══════ NEW ORDER ═══════ */}
          {activeView === "new_order" && (
            <>
              {/* Platform Filter Bar */}
              <div className="mb-5">
                <h3 className="text-gray-400 text-sm font-bold mb-3">اختر شبكة اجتماعية</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setFilterCat("all"); setSelectedCatId(""); setSelectedService(null); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
                    style={filterCat === "all" ? { background: A, color: "white" } : { background: "#1a1a28", border: "1px solid #2a2a40", color: "#9ca3af" }}>
                    ••• الكل
                  </button>
                  {activeCats.map((cat) => (
                    <button key={cat.id} onClick={() => { setFilterCat(cat.id!); setSelectedCatId(""); setSelectedService(null); }}
                      className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                      style={filterCat === cat.id ? { background: `${C}25`, borderColor: `${C}50`, color: C } : { background: "#1a1a28", borderColor: "#2a2a40", color: "#9ca3af" }}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* ── Left: Order Form (3 cols) ── */}
                <div className="lg:col-span-3 card-dark p-5">
                  {/* Search */}
                  <div className="mb-4 relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">🔍</span>
                    <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث عن خدمة..." className="admin-input !pr-10" />
                  </div>

                  {/* Category Select */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الفئة</label>
                    <select value={selectedCatId} onChange={(e) => { setSelectedCatId(e.target.value); setSelectedService(null); }} className="admin-input">
                      <option value="">اختر فئة...</option>
                      {filteredCats.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Select */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الخدمة</label>
                    <select value={selectedService?.id || ""} onChange={(e) => {
                      const svc = services.find(s => s.id === e.target.value);
                      setSelectedService(svc || null); setOrderQuantity("");
                    }} className="admin-input">
                      <option value="">اختر خدمة...</option>
                      {servicesInSelectedCat.map((s) => (
                        <option key={s.id} value={s.id}>{s.api_service_id} - {s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Description */}
                  {selectedService && (
                    <div className="rounded-xl p-4 mb-4 text-sm space-y-1.5" style={{ background: `${C}06`, border: `1px solid ${C}12` }}>
                      <div className="font-bold text-white">الوصف</div>
                      {selectedService.description && <p className="text-gray-400">{selectedService.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                        {selectedService.can_refill && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">♻️ تعويض</span>}
                        {selectedService.can_cancel && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">❌ إلغاء</span>}
                      </div>
                    </div>
                  )}

                  {/* Link */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الرابط</label>
                    <input type="url" value={orderLink} onChange={(e) => setOrderLink(e.target.value)} placeholder="https://..." className="admin-input" dir="ltr" />
                  </div>

                  {/* Quantity */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الكمية</label>
                    <input type="number" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)}
                      placeholder={selectedService ? `${selectedService.min_quantity} - ${selectedService.max_quantity}` : "الكمية"} className="admin-input" dir="ltr" />
                    {selectedService && <p className="text-gray-600 text-xs mt-1">الحد الأدنى: {selectedService.min_quantity.toLocaleString()} — الأقصى: {selectedService.max_quantity.toLocaleString()}</p>}
                  </div>

                  {/* Avg Time */}
                  {selectedService && (
                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-1.5">متوسط الوقت</label>
                      <div className="admin-input !bg-dark-800 text-gray-400">{selectedService.speed}</div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-5">
                    <label className="block text-gray-400 text-sm mb-1.5">التكلفة</label>
                    <div className="admin-input !bg-dark-800 font-display font-bold text-xl" style={{ color: A }} dir="ltr">${orderPrice.toFixed(4)}</div>
                  </div>

                  <button onClick={handlePlaceOrder} className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.01]" style={{ background: A }}>إرسال</button>
                </div>

                {/* ── Right: Info Panel (2 cols) ── */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">📝 معلومات مهمة</h4>
                    <ul className="text-gray-500 text-sm space-y-2">
                      <li>• تبدأ سرعة التوصيل بعد وقت البدء الموجود بالوصف.</li>
                      <li>🟡 = أفضل الخدمات</li>
                      <li>♻️ = زر التعويض مفعّل</li>
                      <li>❌ = زر الإلغاء مفعّل</li>
                    </ul>
                  </div>
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">⚠️ تحذير</h4>
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

          {/* ═══════ ORDERS ═══════ */}
          {activeView === "orders" && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">طلباتي ({orders.length})</h2>
              {orders.length === 0 ? (
                <div className="card-dark p-12 text-center text-gray-500">لا توجد طلبات بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/5 text-gray-500">
                      <th className="py-3 px-2 text-right">رقم</th><th className="py-3 px-2 text-right">الخدمة</th>
                      <th className="py-3 px-2 text-right">الرابط</th><th className="py-3 px-2 text-right">الكمية</th>
                      <th className="py-3 px-2 text-right">السعر</th><th className="py-3 px-2 text-right">الحالة</th>
                      <th className="py-3 px-2 text-right">التاريخ</th><th className="py-3 px-2 text-right">إجراءات</th>
                    </tr></thead>
                    <tbody>{orders.map((o) => {
                      const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                      const svc = (o as any).service;
                      const pid = svc?.provider?.id;
                      const canCancel = svc?.can_cancel && pid && ["pending", "processing"].includes(o.status);
                      const canRefill = svc?.can_refill && pid && ["completed", "partial"].includes(o.status);
                      return (
                        <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 px-2 text-gray-500 text-xs font-mono">{o.api_order_id || o.id?.slice(0, 8)}</td>
                          <td className="py-2 px-2 text-gray-300 text-xs max-w-[180px] truncate">{svc?.name || "-"}</td>
                          <td className="py-2 px-2 text-gray-500 text-xs max-w-[100px] truncate" dir="ltr">{o.link}</td>
                          <td className="py-2 px-2 text-white font-bold">{o.quantity.toLocaleString()}</td>
                          <td className="py-2 px-2 font-bold" style={{ color: C }}>${o.price.toFixed(2)}</td>
                          <td className="py-2 px-2"><span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: `${st.color}20`, color: st.color }}>{st.label}</span></td>
                          <td className="py-2 px-2 text-gray-500 text-xs">{new Date(o.created_at!).toLocaleDateString("ar-EG")}</td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              {canCancel && <button onClick={async () => {
                                if (!confirm("إلغاء؟")) return;
                                const res = await cancelOrders(pid, [o.api_order_id]);
                                if (res?.[0]?.cancel && !res[0].cancel.error) {
                                  await supabase.from("orders").update({ status: "cancelled" }).eq("id", o.id);
                                  toast.success("تم الإلغاء"); fetchOrders(user.id);
                                } else toast.error("فشل");
                              }} className="text-xs px-2 py-1 rounded bg-red-500/15 text-red-400">إلغاء</button>}
                              {canRefill && <button onClick={async () => {
                                const res = await refillOrder(pid, o.api_order_id);
                                res?.refill ? toast.success("تم طلب التعويض") : toast.error("فشل");
                              }} className="text-xs px-2 py-1 rounded bg-green-500/15 text-green-400">تعويض</button>}
                            </div>
                          </td>
                        </tr>);
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════ SERVICES LIST ═══════ */}
          {activeView === "services" && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">جميع الخدمات ({services.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/5 text-gray-500">
                    <th className="py-2 px-2 text-right">ID</th><th className="py-2 px-2 text-right">الخدمة</th>
                    <th className="py-2 px-2 text-right">$/1K</th><th className="py-2 px-2 text-right">أقل</th>
                    <th className="py-2 px-2 text-right">أعلى</th><th className="py-2 px-2 text-right">السرعة</th>
                  </tr></thead>
                  <tbody>{services.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 px-2 text-gray-500 font-mono">{s.api_service_id}</td>
                      <td className="py-2 px-2 text-gray-300">{s.name}</td>
                      <td className="py-2 px-2 font-bold" style={{ color: A }}>${s.price_per_1000}</td>
                      <td className="py-2 px-2 text-gray-400">{s.min_quantity.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-400">{s.max_quantity.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-400">{s.speed}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════ SETTINGS ═══════ */}
          {activeView === "settings" && (
            <div className="max-w-lg">
              <h2 className="text-lg font-bold text-white mb-4">إعدادات الحساب</h2>
              <div className="card-dark p-6 space-y-4">
                <div><label className="block text-gray-400 text-sm mb-1">اسم المستخدم</label><input value={profile?.username || ""} className="admin-input" readOnly dir="ltr" /></div>
                <div><label className="block text-gray-400 text-sm mb-1">البريد</label><input value={user?.email || ""} className="admin-input" readOnly dir="ltr" /></div>
                <div><label className="block text-gray-400 text-sm mb-1">المستوى</label><div className="admin-input !bg-dark-800">المستوى {profile?.level || 1} — خصم {profile?.discount || 0}%</div></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
