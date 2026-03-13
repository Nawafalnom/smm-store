"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, STORE, PLATFORMS, ORDER_STATUSES, type Category, type Service, type Order, type Profile, type Provider } from "@/lib/supabase";
import { getProviderServices, getProviderBalance, getMultiOrderStatus } from "@/lib/smm-api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"providers" | "categories" | "services" | "orders" | "users">("providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Provider form
  const [showProvForm, setShowProvForm] = useState(false);
  const [editingProv, setEditingProv] = useState<Provider | null>(null);
  const [provForm, setProvForm] = useState<Partial<Provider>>({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 });

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<Partial<Category>>({ name: "", sort_order: 0, is_active: true });

  // Service form
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState<Partial<Service>>({ category_id: "", provider_id: "", name: "", platform: PLATFORMS[0], api_service_id: 0, price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "Default", guarantee_days: 0, description: "", can_refill: false, can_cancel: false, is_active: true, sort_order: 0 });

  const A = STORE.accentColor;

  function handleLogin() {
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456")) { setAuthed(true); toast.success("تم تسجيل الدخول"); }
    else toast.error("كلمة المرور غير صحيحة");
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, c, s, o, u] = await Promise.all([
      supabase.from("providers").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("services").select("*, category:categories(name), provider:providers(name)").order("sort_order"),
      supabase.from("orders").select("*, service:services(name, provider_id)").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (p.data) setProviders(p.data);
    if (c.data) setCategories(c.data);
    if (s.data) setServices(s.data);
    if (o.data) setOrders(o.data);
    if (u.data) setUsers(u.data);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);

  // ── Provider CRUD ──
  async function saveProv() {
    try {
      if (editingProv?.id) { await supabase.from("providers").update(provForm).eq("id", editingProv.id); }
      else { await supabase.from("providers").insert(provForm); }
      toast.success("تم الحفظ"); setShowProvForm(false); setEditingProv(null);
      setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); fetchAll();
    } catch { toast.error("خطأ"); }
  }
  async function deleteProv(id: string) {
    if (!confirm("حذف المزوّد؟")) return;
    await supabase.from("providers").delete().eq("id", id); toast.success("تم الحذف"); fetchAll();
  }

  // ── Fetch balance for one provider ──
  async function refreshBalance(prov: Provider) {
    try {
      const res = await getProviderBalance(prov.id!);
      if (res?.balance) {
        await supabase.from("providers").update({ balance: Number(res.balance) }).eq("id", prov.id);
        toast.success(`${prov.name}: $${Number(res.balance).toFixed(2)}`);
        fetchAll();
      } else toast.error("فشل جلب الرصيد");
    } catch { toast.error("خطأ"); }
  }

  // ── Sync services from a provider ──
  async function syncFromProvider(prov: Provider) {
    setSyncing(true);
    try {
      const apiServices = await getProviderServices(prov.id!);
      if (!Array.isArray(apiServices)) { toast.error("فشل جلب الخدمات"); setSyncing(false); return; }

      // Ensure categories
      const catNames = Array.from(new Set(apiServices.map((s: any) => s.category))) as string[];
      for (const name of catNames) {
        const { data: ex } = await supabase.from("categories").select("id").eq("name", name).single();
        if (!ex) await supabase.from("categories").insert({ name, sort_order: 0, is_active: true });
      }
      const { data: allCats } = await supabase.from("categories").select("*");
      const catMap: Record<string, string> = {};
      (allCats || []).forEach((c: any) => { catMap[c.name] = c.id; });

      let added = 0, updated = 0;
      for (const s of apiServices) {
        const { data: existing } = await supabase.from("services").select("id")
          .eq("api_service_id", s.service).eq("provider_id", prov.id).single();

        const svcData = {
          api_service_id: s.service,
          provider_id: prov.id,
          name: s.name,
          category_id: catMap[s.category] || "",
          platform: s.category,
          price_per_1000: Number(s.rate),
          min_quantity: Number(s.min),
          max_quantity: Number(s.max),
          can_refill: s.refill || false,
          can_cancel: s.cancel || false,
          speed: s.type || "Default",
          guarantee_days: 0,
          description: `${s.type} | $${s.rate}/1K${s.refill ? " | ♻️ Refill" : ""}${s.cancel ? " | ❌ Cancel" : ""}`,
          is_active: true,
          sort_order: s.service,
        };

        if (existing) { await supabase.from("services").update(svcData).eq("id", existing.id); updated++; }
        else { await supabase.from("services").insert(svcData); added++; }
      }

      toast.success(`${prov.name}: ${added} جديد، ${updated} محدّث`);
      fetchAll();
    } catch (err) { console.error(err); toast.error("خطأ في المزامنة"); }
    finally { setSyncing(false); }
  }

  // ── Update order statuses per provider ──
  async function updateOrderStatuses() {
    setSyncing(true);
    try {
      const { data: pendingOrders } = await supabase.from("orders")
        .select("*, service:services(provider_id)")
        .in("status", ["pending", "processing", "in_progress"])
        .neq("api_order_id", "").limit(100);

      if (!pendingOrders?.length) { toast("لا توجد طلبات قيد التنفيذ"); setSyncing(false); return; }

      // Group by provider
      const byProvider: Record<string, typeof pendingOrders> = {};
      for (const o of pendingOrders) {
        const pid = (o as any).service?.provider_id;
        if (pid) { (byProvider[pid] = byProvider[pid] || []).push(o); }
      }

      const statusMap: Record<string, string> = {
        "Pending": "pending", "Processing": "processing", "In progress": "in_progress",
        "Completed": "completed", "Cancelled": "cancelled", "Partial": "partial", "Canceled": "cancelled",
      };

      let total = 0;
      for (const [pid, ords] of Object.entries(byProvider)) {
        const apiIds = ords.map((o) => o.api_order_id);
        const statuses = await getMultiOrderStatus(pid, apiIds);

        for (const o of ords) {
          const s = statuses?.[o.api_order_id];
          if (s && !s.error) {
            await supabase.from("orders").update({
              status: statusMap[s.status] || o.status,
              start_count: Number(s.start_count) || 0,
              remains: Number(s.remains) || 0,
            }).eq("id", o.id);
            total++;
          }
        }
      }
      toast.success(`تم تحديث ${total} طلب`);
      fetchAll();
    } catch (err) { console.error(err); toast.error("خطأ"); }
    finally { setSyncing(false); }
  }

  // ── Category CRUD ──
  async function saveCat() {
    try {
      if (editingCat?.id) await supabase.from("categories").update(catForm).eq("id", editingCat.id);
      else await supabase.from("categories").insert(catForm);
      toast.success("تم الحفظ"); setShowCatForm(false); setEditingCat(null);
      setCatForm({ name: "", sort_order: 0, is_active: true }); fetchAll();
    } catch { toast.error("خطأ"); }
  }
  async function deleteCat(id: string) { if (!confirm("حذف الفئة؟")) return; await supabase.from("categories").delete().eq("id", id); fetchAll(); }

  // ── Service CRUD ──
  async function saveSvc() {
    try {
      if (editingSvc?.id) await supabase.from("services").update(svcForm).eq("id", editingSvc.id);
      else await supabase.from("services").insert(svcForm);
      toast.success("تم الحفظ"); setShowSvcForm(false); setEditingSvc(null); fetchAll();
    } catch { toast.error("خطأ"); }
  }
  async function deleteSvc(id: string) { if (!confirm("حذف الخدمة؟")) return; await supabase.from("services").delete().eq("id", id); fetchAll(); }

  async function updateOrderStatus(id: string, status: string) { await supabase.from("orders").update({ status }).eq("id", id); fetchAll(); }
  async function updateBalance(uid: string) {
    const val = prompt("أدخل الرصيد الجديد:"); if (!val) return;
    await supabase.from("profiles").update({ balance: Number(val) }).eq("id", uid); toast.success("تم"); fetchAll();
  }

  // ── LOGIN ──
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 bg-grid p-4" style={{ "--brand-rgb": STORE.colorRgb } as any}>
      <div className="w-full max-w-sm card-dark p-8 text-center">
        <h1 className="font-display text-2xl font-800 mb-1" style={{ color: A }}>Admin Panel</h1>
        <p className="text-gray-500 mb-6 text-sm">لوحة الإدارة</p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="كلمة المرور" className="admin-input mb-4" dir="ltr" />
        <button onClick={handleLogin} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>دخول</button>
        <Link href="/" className="block mt-4 text-sm text-gray-500">← المتجر</Link>
      </div>
    </div>
  );

  const TABS = [
    { k: "providers", l: "🔌 المزوّدين", c: providers.length },
    { k: "categories", l: "📁 الفئات", c: categories.length },
    { k: "services", l: "📦 الخدمات", c: services.length },
    { k: "orders", l: "📋 الطلبات", c: orders.length },
    { k: "users", l: "👥 المستخدمين", c: users.length },
  ];

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": STORE.color, "--brand-rgb": STORE.colorRgb } as any}>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm">← الموقع</Link>
            <span className="font-display font-800" style={{ color: A }}>Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={updateOrderStatuses} disabled={syncing}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: "#3b82f6" }}>
              {syncing ? "..." : "📊 تحديث الطلبات"}
            </button>
            <button onClick={() => setAuthed(false)} className="text-gray-500 hover:text-red-400 text-sm">خروج</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${tab === t.k ? "text-white" : "text-gray-500"}`}
              style={tab === t.k ? { background: `${A}25`, color: A } : {}}>
              {t.l} <span className="text-xs opacity-60">({t.c})</span>
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-500">جاري التحميل...</div>}

        {/* ═══ PROVIDERS TAB ═══ */}
        {!loading && tab === "providers" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">المزوّدين (Providers)</h2>
              <button onClick={() => { setEditingProv(null); setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); setShowProvForm(true); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ إضافة مزوّد</button>
            </div>
            <div className="space-y-3">
              {providers.map((p) => (
                <div key={p.id} className="card-dark p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-white font-display font-800 text-lg">{p.name}</span>
                      <span className={`mr-2 text-xs px-2 py-0.5 rounded ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {p.is_active ? "مفعّل" : "معطّل"}
                      </span>
                    </div>
                    <div className="font-display font-bold text-lg" style={{ color: "#f59e0b" }}>${(p.balance || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-gray-500 text-xs mb-3" dir="ltr">{p.api_url}</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => syncFromProvider(p)} disabled={syncing}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">
                      {syncing ? "جاري..." : "🔄 مزامنة الخدمات"}
                    </button>
                    <button onClick={() => refreshBalance(p)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25">
                      💰 تحديث الرصيد
                    </button>
                    <button onClick={() => { setEditingProv(p); setProvForm({ ...p }); setShowProvForm(true); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25">تعديل</button>
                    <button onClick={() => deleteProv(p.id!)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25">حذف</button>
                  </div>
                </div>
              ))}
              {providers.length === 0 && (
                <div className="card-dark p-12 text-center text-gray-500">لا يوجد مزوّدين بعد. اضغط &quot;+ إضافة مزوّد&quot;</div>
              )}
            </div>
          </>
        )}

        {/* ═══ CATEGORIES TAB ═══ */}
        {!loading && tab === "categories" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">الفئات</h2>
              <button onClick={() => { setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); setShowCatForm(true); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ فئة</button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="card-dark p-4 flex items-center justify-between">
                  <div><span className="text-white font-bold">{c.name}</span>
                    <span className={`mr-2 text-xs px-2 py-0.5 rounded ${c.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{c.is_active ? "مفعّل" : "معطّل"}</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCat(c); setCatForm({ ...c }); setShowCatForm(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400">تعديل</button>
                    <button onClick={() => deleteCat(c.id!)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ SERVICES TAB ═══ */}
        {!loading && tab === "services" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">الخدمات</h2>
              <button onClick={() => { setEditingSvc(null); setSvcForm({ category_id: categories[0]?.id || "", provider_id: providers[0]?.id || "", name: "", platform: PLATFORMS[0], api_service_id: 0, price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "Default", guarantee_days: 0, description: "", can_refill: false, can_cancel: false, is_active: true, sort_order: 0 }); setShowSvcForm(true); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ خدمة</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5 text-gray-500">
                  <th className="py-2 px-2 text-right">ID</th><th className="py-2 px-2 text-right">الاسم</th><th className="py-2 px-2 text-right">المزوّد</th>
                  <th className="py-2 px-2 text-right">الفئة</th><th className="py-2 px-2 text-right">$/1K</th><th className="py-2 px-2 text-right">R/C</th>
                  <th className="py-2 px-2 text-right">الحالة</th><th className="py-2 px-2 text-right">-</th>
                </tr></thead>
                <tbody>{services.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-gray-500 font-mono">{s.api_service_id}</td>
                    <td className="py-2 px-2 text-gray-300 max-w-[200px] truncate">{s.name}</td>
                    <td className="py-2 px-2 text-purple-400 text-xs">{(s as any).provider?.name || "-"}</td>
                    <td className="py-2 px-2 text-gray-500">{(s as any).category?.name || "-"}</td>
                    <td className="py-2 px-2 font-bold" style={{ color: A }}>${s.price_per_1000}</td>
                    <td className="py-2 px-2">{s.can_refill ? "♻️" : ""}{s.can_cancel ? "❌" : ""}</td>
                    <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded ${s.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{s.is_active ? "✓" : "✗"}</span></td>
                    <td className="py-2 px-2 flex gap-1">
                      <button onClick={() => { setEditingSvc(s); setSvcForm({ ...s }); setShowSvcForm(true); }} className="px-2 py-1 rounded bg-blue-500/15 text-blue-400">✏️</button>
                      <button onClick={() => deleteSvc(s.id!)} className="px-2 py-1 rounded bg-red-500/15 text-red-400">🗑️</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══ ORDERS TAB ═══ */}
        {!loading && tab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/5 text-gray-500">
                <th className="py-2 px-2 text-right">API#</th><th className="py-2 px-2 text-right">الخدمة</th>
                <th className="py-2 px-2 text-right">الكمية</th><th className="py-2 px-2 text-right">السعر</th>
                <th className="py-2 px-2 text-right">الحالة</th><th className="py-2 px-2 text-right">التاريخ</th>
              </tr></thead>
              <tbody>{orders.map((o) => {
                const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                return (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-2 px-2 text-gray-500 font-mono">{o.api_order_id || o.id?.slice(0, 8)}</td>
                    <td className="py-2 px-2 text-gray-300">{(o as any).service?.name || "-"}</td>
                    <td className="py-2 px-2 text-white">{o.quantity}</td>
                    <td className="py-2 px-2 font-bold" style={{ color: A }}>${o.price.toFixed(2)}</td>
                    <td className="py-2 px-2">
                      <select value={o.status} onChange={(e) => updateOrderStatus(o.id!, e.target.value)}
                        className="rounded px-1 py-0.5 bg-dark-700 border-0 text-xs" style={{ color: st.color }}>
                        {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-gray-500">{new Date(o.created_at!).toLocaleDateString("ar-EG")}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {!loading && tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-gray-500">
                <th className="py-2 px-2 text-right">المستخدم</th><th className="py-2 px-2 text-right">الرصيد</th>
                <th className="py-2 px-2 text-right">الإنفاق</th><th className="py-2 px-2 text-right">المستوى</th><th className="py-2 px-2 text-right">-</th>
              </tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-2 px-2 text-white font-bold">{u.username}</td>
                  <td className="py-2 px-2" style={{ color: STORE.color }}>${u.balance.toFixed(2)}</td>
                  <td className="py-2 px-2 text-gray-400">${u.total_spent.toFixed(2)}</td>
                  <td className="py-2 px-2 text-gray-400">{u.level}</td>
                  <td className="py-2 px-2"><button onClick={() => updateBalance(u.id)} className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">تعديل الرصيد</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ PROVIDER MODAL ═══ */}
      {showProvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProvForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingProv ? "تعديل مزوّد" : "إضافة مزوّد جديد"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">اسم المزوّد</label>
                <input value={provForm.name || ""} onChange={(e) => setProvForm({ ...provForm, name: e.target.value })} placeholder="مثال: SMMJob" className="admin-input" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">API URL</label>
                <input value={provForm.api_url || ""} onChange={(e) => setProvForm({ ...provForm, api_url: e.target.value })} placeholder="https://example.com/api/v2" className="admin-input" dir="ltr" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">API Key</label>
                <input value={provForm.api_key || ""} onChange={(e) => setProvForm({ ...provForm, api_key: e.target.value })} placeholder="Your API key" className="admin-input" dir="ltr" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">الترتيب</label>
                <input type="number" value={provForm.sort_order || 0} onChange={(e) => setProvForm({ ...provForm, sort_order: Number(e.target.value) })} className="admin-input" dir="ltr" />
              </div>
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={provForm.is_active} onChange={(e) => setProvForm({ ...provForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveProv} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CATEGORY MODAL ═══ */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingCat ? "تعديل" : "إضافة"} فئة</h2>
            <div className="space-y-3">
              <input value={catForm.name || ""} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="اسم الفئة" className="admin-input" />
              <input type="number" value={catForm.sort_order || 0} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} className="admin-input" dir="ltr" />
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveCat} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SERVICE MODAL ═══ */}
      {showSvcForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSvcForm(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingSvc ? "تعديل" : "إضافة"} خدمة</h2>
            <div className="space-y-3">
              <div><label className="text-gray-500 text-xs">المزوّد</label>
                <select value={svcForm.provider_id || ""} onChange={(e) => setSvcForm({ ...svcForm, provider_id: e.target.value })} className="admin-input">
                  <option value="">اختر مزوّد...</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="text-gray-500 text-xs">الفئة</label>
                <select value={svcForm.category_id || ""} onChange={(e) => setSvcForm({ ...svcForm, category_id: e.target.value })} className="admin-input">
                  <option value="">اختر فئة...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <input value={svcForm.name || ""} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="اسم الخدمة" className="admin-input" />
              <div><label className="text-gray-500 text-xs">API Service ID</label>
                <input type="number" value={svcForm.api_service_id || 0} onChange={(e) => setSvcForm({ ...svcForm, api_service_id: Number(e.target.value) })} className="admin-input" dir="ltr" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-gray-500 text-xs">سعر/1000</label><input type="number" step="0.001" value={svcForm.price_per_1000 || ""} onChange={(e) => setSvcForm({ ...svcForm, price_per_1000: Number(e.target.value) })} className="admin-input" dir="ltr" /></div>
                <div><label className="text-gray-500 text-xs">أقل كمية</label><input type="number" value={svcForm.min_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, min_quantity: Number(e.target.value) })} className="admin-input" dir="ltr" /></div>
                <div><label className="text-gray-500 text-xs">أعلى كمية</label><input type="number" value={svcForm.max_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, max_quantity: Number(e.target.value) })} className="admin-input" dir="ltr" /></div>
                <div><label className="text-gray-500 text-xs">ضمان (أيام)</label><input type="number" value={svcForm.guarantee_days || ""} onChange={(e) => setSvcForm({ ...svcForm, guarantee_days: Number(e.target.value) })} className="admin-input" dir="ltr" /></div>
              </div>
              <input value={svcForm.speed || ""} onChange={(e) => setSvcForm({ ...svcForm, speed: e.target.value })} placeholder="السرعة" className="admin-input" />
              <textarea value={svcForm.description || ""} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="الوصف" className="admin-input !h-20" />
              <input type="number" value={svcForm.sort_order || 0} onChange={(e) => setSvcForm({ ...svcForm, sort_order: Number(e.target.value) })} placeholder="الترتيب" className="admin-input" dir="ltr" />
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={svcForm.is_active} onChange={(e) => setSvcForm({ ...svcForm, is_active: e.target.checked })} /> مفعّل</label>
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={svcForm.can_refill || false} onChange={(e) => setSvcForm({ ...svcForm, can_refill: e.target.checked })} /> يدعم التعويض ♻️</label>
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={svcForm.can_cancel || false} onChange={(e) => setSvcForm({ ...svcForm, can_cancel: e.target.checked })} /> يدعم الإلغاء ❌</label>
              <button onClick={saveSvc} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
