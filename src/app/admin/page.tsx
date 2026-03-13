"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, STORE, PLATFORMS, ORDER_STATUSES, type Category, type Service, type Order, type Profile } from "@/lib/supabase";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"categories" | "services" | "orders" | "users">("services");
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState<Partial<Category>>({ name: "", sort_order: 0, is_active: true });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [showSvcForm, setShowSvcForm] = useState(false);
  const [svcForm, setSvcForm] = useState<Partial<Service>>({
    category_id: "", name: "", platform: PLATFORMS[0], price_per_1000: 0,
    min_quantity: 10, max_quantity: 100000, speed: "فوري", guarantee_days: 0,
    description: "", is_active: true, sort_order: 0,
  });
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);

  const C = STORE.color; const A = STORE.accentColor;

  function handleLogin() {
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456")) {
      setAuthed(true); toast.success("تم تسجيل الدخول");
    } else toast.error("كلمة المرور غير صحيحة");
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, s, o, u] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("services").select("*, category:categories(name)").order("sort_order"),
      supabase.from("orders").select("*, service:services(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.data) setCategories(c.data);
    if (s.data) setServices(s.data);
    if (o.data) setOrders(o.data);
    if (u.data) setUsers(u.data);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);

  // ── Category CRUD ──
  async function saveCat() {
    try {
      if (editingCat?.id) {
        await supabase.from("categories").update(catForm).eq("id", editingCat.id);
      } else {
        await supabase.from("categories").insert(catForm);
      }
      toast.success("تم الحفظ"); setShowCatForm(false); setEditingCat(null);
      setCatForm({ name: "", sort_order: 0, is_active: true }); fetchAll();
    } catch { toast.error("خطأ"); }
  }
  async function deleteCat(id: string) {
    if (!confirm("حذف الفئة؟")) return;
    await supabase.from("categories").delete().eq("id", id); toast.success("تم الحذف"); fetchAll();
  }

  // ── Service CRUD ──
  async function saveSvc() {
    try {
      if (editingSvc?.id) {
        await supabase.from("services").update(svcForm).eq("id", editingSvc.id);
      } else {
        await supabase.from("services").insert(svcForm);
      }
      toast.success("تم الحفظ"); setShowSvcForm(false); setEditingSvc(null);
      setSvcForm({ category_id: "", name: "", platform: PLATFORMS[0], price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "فوري", guarantee_days: 0, description: "", is_active: true, sort_order: 0 });
      fetchAll();
    } catch { toast.error("خطأ"); }
  }
  async function deleteSvc(id: string) {
    if (!confirm("حذف الخدمة؟")) return;
    await supabase.from("services").delete().eq("id", id); toast.success("تم الحذف"); fetchAll();
  }

  // ── Update order status ──
  async function updateOrderStatus(id: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", id); fetchAll();
  }

  // ── Update user balance ──
  async function updateBalance(uid: string, amount: number) {
    const val = prompt("أدخل الرصيد الجديد:");
    if (!val) return;
    await supabase.from("profiles").update({ balance: Number(val) }).eq("id", uid);
    toast.success("تم تحديث الرصيد"); fetchAll();
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 bg-grid p-4" style={{ "--brand-rgb": STORE.colorRgb } as any}>
        <div className="w-full max-w-sm card-dark p-8 text-center">
          <h1 className="font-display text-2xl font-800 mb-1" style={{ color: A }}>Admin Panel</h1>
          <p className="text-gray-500 mb-6 text-sm">لوحة الإدارة — أدخل كلمة المرور</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="كلمة المرور" className="admin-input mb-4" dir="ltr" />
          <button onClick={handleLogin} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>دخول</button>
          <Link href="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-300">← المتجر</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm">← الموقع</Link>
            <span className="font-display font-800" style={{ color: A }}>Admin Panel</span>
          </div>
          <button onClick={() => setAuthed(false)} className="text-gray-500 hover:text-red-400 text-sm">خروج</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { l: "الفئات", v: categories.length, c: C },
            { l: "الخدمات", v: services.length, c: A },
            { l: "الطلبات", v: orders.length, c: "#10b981" },
            { l: "المستخدمين", v: users.length, c: "#3b82f6" },
          ].map((s, i) => (
            <div key={i} className="card-dark p-4 text-center">
              <div className="font-display text-2xl font-900" style={{ color: s.c }}>{s.v}</div>
              <div className="text-gray-500 text-xs">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["categories", "services", "orders", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === t ? "text-white" : "text-gray-500"}`}
              style={tab === t ? { background: `${A}25`, color: A } : {}}>
              {t === "categories" ? "📁 الفئات" : t === "services" ? "📦 الخدمات" : t === "orders" ? "📋 الطلبات" : "👥 المستخدمين"}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-500">جاري التحميل...</div>}

        {/* ── CATEGORIES ── */}
        {!loading && tab === "categories" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">الفئات ({categories.length})</h2>
              <button onClick={() => { setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); setShowCatForm(true); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ إضافة فئة</button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="card-dark p-4 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold">{c.name}</span>
                    <span className={`mr-2 text-xs px-2 py-0.5 rounded ${c.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {c.is_active ? "مفعّل" : "معطّل"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCat(c); setCatForm({ ...c }); setShowCatForm(true); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400">تعديل</button>
                    <button onClick={() => deleteCat(c.id!)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SERVICES ── */}
        {!loading && tab === "services" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-300">الخدمات ({services.length})</h2>
              <button onClick={() => { setEditingSvc(null); setSvcForm({ category_id: categories[0]?.id || "", name: "", platform: PLATFORMS[0], price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "فوري", guarantee_days: 0, description: "", is_active: true, sort_order: 0 }); setShowSvcForm(true); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ إضافة خدمة</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/5 text-gray-500">
                  <th className="py-2 px-2 text-right">الاسم</th><th className="py-2 px-2 text-right">الفئة</th>
                  <th className="py-2 px-2 text-right">$/1000</th><th className="py-2 px-2 text-right">الحالة</th>
                  <th className="py-2 px-2 text-right">إجراءات</th>
                </tr></thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2 px-2 text-gray-300 text-xs">{s.name}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{(s as any).category?.name || "-"}</td>
                      <td className="py-2 px-2 font-bold" style={{ color: A }}>${s.price_per_1000}</td>
                      <td className="py-2 px-2"><span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{s.is_active ? "مفعّل" : "معطّل"}</span></td>
                      <td className="py-2 px-2">
                        <button onClick={() => { setEditingSvc(s); setSvcForm({ ...s }); setShowSvcForm(true); }} className="text-xs px-2 py-1 rounded bg-blue-500/15 text-blue-400 ml-1">تعديل</button>
                        <button onClick={() => deleteSvc(s.id!)} className="text-xs px-2 py-1 rounded bg-red-500/15 text-red-400">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── ORDERS ── */}
        {!loading && tab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-gray-500">
                <th className="py-2 px-2 text-right">رقم</th><th className="py-2 px-2 text-right">الخدمة</th>
                <th className="py-2 px-2 text-right">الكمية</th><th className="py-2 px-2 text-right">السعر</th>
                <th className="py-2 px-2 text-right">الحالة</th><th className="py-2 px-2 text-right">التاريخ</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => {
                  const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                  return (
                    <tr key={o.id} className="border-b border-white/5">
                      <td className="py-2 px-2 text-gray-500 text-xs font-mono">{o.id?.slice(0, 8)}</td>
                      <td className="py-2 px-2 text-gray-300 text-xs">{(o as any).service?.name || "-"}</td>
                      <td className="py-2 px-2 text-white">{o.quantity}</td>
                      <td className="py-2 px-2 font-bold" style={{ color: A }}>${o.price.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <select value={o.status} onChange={(e) => updateOrderStatus(o.id!, e.target.value)}
                          className="text-xs rounded px-1 py-0.5 bg-dark-700 border-0" style={{ color: st.color }}>
                          {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{new Date(o.created_at!).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USERS ── */}
        {!loading && tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-gray-500">
                <th className="py-2 px-2 text-right">اسم المستخدم</th><th className="py-2 px-2 text-right">الرصيد</th>
                <th className="py-2 px-2 text-right">الإنفاق</th><th className="py-2 px-2 text-right">المستوى</th>
                <th className="py-2 px-2 text-right">إجراءات</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="py-2 px-2 text-white font-bold">{u.username}</td>
                    <td className="py-2 px-2" style={{ color: C }}>${u.balance.toFixed(2)}</td>
                    <td className="py-2 px-2 text-gray-400">${u.total_spent.toFixed(2)}</td>
                    <td className="py-2 px-2 text-gray-400">{u.level}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => updateBalance(u.id, u.balance)}
                        className="text-xs px-2 py-1 rounded bg-green-500/15 text-green-400">تعديل الرصيد</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Category Modal ── */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingCat ? "تعديل فئة" : "إضافة فئة"}</h2>
            <div className="space-y-3">
              <input value={catForm.name || ""} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="اسم الفئة" className="admin-input" />
              <input type="number" value={catForm.sort_order || 0} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} placeholder="الترتيب" className="admin-input" dir="ltr" />
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveCat} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Modal ── */}
      {showSvcForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSvcForm(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingSvc ? "تعديل خدمة" : "إضافة خدمة"}</h2>
            <div className="space-y-3">
              <select value={svcForm.category_id || ""} onChange={(e) => setSvcForm({ ...svcForm, category_id: e.target.value })} className="admin-input">
                <option value="">اختر فئة...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={svcForm.name || ""} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="اسم الخدمة" className="admin-input" />
              <select value={svcForm.platform || ""} onChange={(e) => setSvcForm({ ...svcForm, platform: e.target.value })} className="admin-input">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs">سعر/1000</label>
                  <input type="number" step="0.001" value={svcForm.price_per_1000 || ""} onChange={(e) => setSvcForm({ ...svcForm, price_per_1000: Number(e.target.value) })} className="admin-input" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">أقل كمية</label>
                  <input type="number" value={svcForm.min_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, min_quantity: Number(e.target.value) })} className="admin-input" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">أعلى كمية</label>
                  <input type="number" value={svcForm.max_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, max_quantity: Number(e.target.value) })} className="admin-input" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">أيام الضمان</label>
                  <input type="number" value={svcForm.guarantee_days || ""} onChange={(e) => setSvcForm({ ...svcForm, guarantee_days: Number(e.target.value) })} className="admin-input" dir="ltr" />
                </div>
              </div>
              <input value={svcForm.speed || ""} onChange={(e) => setSvcForm({ ...svcForm, speed: e.target.value })} placeholder="السرعة" className="admin-input" />
              <textarea value={svcForm.description || ""} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="الوصف" className="admin-input !h-20" />
              <input type="number" value={svcForm.sort_order || 0} onChange={(e) => setSvcForm({ ...svcForm, sort_order: Number(e.target.value) })} placeholder="الترتيب" className="admin-input" dir="ltr" />
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={svcForm.is_active} onChange={(e) => setSvcForm({ ...svcForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveSvc} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
