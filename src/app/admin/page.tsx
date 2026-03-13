"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, STORE, PLATFORMS, SERVICES, CURRENCIES, type Package, type Order } from "@/lib/supabase";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"packages" | "orders">("packages");
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [form, setForm] = useState<Partial<Package>>({
    platform: PLATFORMS[0],
    service: SERVICES[0],
    quantity: "",
    price_syp: 0,
    price_egp: 0,
    price_usd: 0,
    price_sar: 0,
    is_active: true,
    sort_order: 0,
  });

  function handleLogin() {
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456";
    if (password === adminPass) {
      setAuthed(true);
      toast.success("تم تسجيل الدخول");
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  }

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error(err);
      toast.error("خطأ في تحميل الباقات");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (activeTab === "packages") fetchPackages();
    else fetchOrders();
  }, [authed, activeTab, fetchPackages, fetchOrders]);

  async function savePackage() {
    try {
      if (editingPkg?.id) {
        const { error } = await supabase
          .from("packages")
          .update(form)
          .eq("id", editingPkg.id);
        if (error) throw error;
        toast.success("تم تعديل الباقة");
      } else {
        const { error } = await supabase.from("packages").insert(form);
        if (error) throw error;
        toast.success("تم إضافة الباقة");
      }
      setShowForm(false);
      setEditingPkg(null);
      resetForm();
      fetchPackages();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ");
    }
  }

  async function deletePackage(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    try {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم حذف الباقة");
      fetchPackages();
    } catch (err) {
      toast.error("خطأ في الحذف");
    }
  }

  async function toggleActive(pkg: Package) {
    try {
      const { error } = await supabase
        .from("packages")
        .update({ is_active: !pkg.is_active })
        .eq("id", pkg.id);
      if (error) throw error;
      fetchPackages();
    } catch (err) {
      toast.error("خطأ");
    }
  }

  function editPackage(pkg: Package) {
    setEditingPkg(pkg);
    setForm({ ...pkg });
    setShowForm(true);
  }

  function resetForm() {
    setForm({
      platform: PLATFORMS[0],
      service: SERVICES[0],
      quantity: "",
      price_syp: 0,
      price_egp: 0,
      price_usd: 0,
      price_sar: 0,
      is_active: true,
      sort_order: 0,
    });
  }

  // Login Screen
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 bg-grid p-4" style={{ "--brand-rgb": STORE.colorRgb } as any}>
        <div className="w-full max-w-sm card-dark p-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${STORE.color}15`, border: `1px solid ${STORE.color}30` }}
          >
            <span className="text-2xl font-display font-900" style={{ color: STORE.color }}>G</span>
          </div>
          <h1 className="font-display text-2xl font-800 mb-1" style={{ color: STORE.color }}>
            {STORE.name}
          </h1>
          <p className="text-gray-500 mb-6 text-sm">لوحة التحكم — أدخل كلمة المرور</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="كلمة المرور"
            className="admin-input mb-4"
            dir="ltr"
          />
          <button
            onClick={handleLogin}
            className="neon-btn w-full py-3 rounded-xl font-bold"
          >
            دخول
          </button>
          <Link href="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-300">
            ← العودة للمتجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": STORE.color, "--brand-rgb": STORE.colorRgb } as any}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm">← المتجر</Link>
            <span className="font-display font-800" style={{ color: STORE.color }}>{STORE.name}</span>
            <span className="text-gray-600 text-sm">— لوحة التحكم</span>
          </div>
          <button onClick={() => setAuthed(false)} className="text-gray-500 hover:text-red-400 text-sm">
            تسجيل خروج
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["packages", "orders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                activeTab === tab ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "packages" ? "📦 الباقات" : "📋 الطلبات"}
            </button>
          ))}
        </div>

        {/* PACKAGES TAB */}
        {activeTab === "packages" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-300">
                الباقات ({packages.length})
              </h2>
              <button
                onClick={() => {
                  setEditingPkg(null);
                  resetForm();
                  setShowForm(true);
                }}
                className="neon-btn px-5 py-2.5 rounded-xl font-bold text-sm"
              >
                + إضافة باقة
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
            ) : packages.length === 0 ? (
              <div className="text-center py-16 card-dark">
                <p className="text-gray-500 text-lg mb-2">لا توجد باقات بعد</p>
                <p className="text-gray-600 text-sm">اضغط &quot;إضافة باقة&quot; للبدء</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500">
                      <th className="py-3 px-3 text-right">المنصة</th>
                      <th className="py-3 px-3 text-right">الخدمة</th>
                      <th className="py-3 px-3 text-right">الكمية</th>
                      <th className="py-3 px-3 text-right">ل.س</th>
                      <th className="py-3 px-3 text-right">ج.م</th>
                      <th className="py-3 px-3 text-right">$</th>
                      <th className="py-3 px-3 text-right">ر.س</th>
                      <th className="py-3 px-3 text-right">الحالة</th>
                      <th className="py-3 px-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-3">
                          <span
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: `${STORE.color}15`, color: STORE.color }}
                          >
                            {pkg.platform}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-300">{pkg.service}</td>
                        <td className="py-3 px-3 text-white font-bold">{pkg.quantity}</td>
                        <td className="py-3 px-3 text-gray-400">{pkg.price_syp?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-400">{pkg.price_egp?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-400">{pkg.price_usd?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-400">{pkg.price_sar?.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleActive(pkg)}
                            className={`text-xs px-2 py-1 rounded-lg font-bold ${
                              pkg.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {pkg.is_active ? "مفعّل" : "معطّل"}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editPackage(pkg)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => deletePackage(pkg.id!)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <>
            <h2 className="text-lg font-bold text-gray-300 mb-4">
              الطلبات ({orders.length})
            </h2>
            {loading ? (
              <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 card-dark">
                <p className="text-gray-500">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500">
                      <th className="py-3 px-3 text-right">التاريخ</th>
                      <th className="py-3 px-3 text-right">العميل</th>
                      <th className="py-3 px-3 text-right">الهاتف</th>
                      <th className="py-3 px-3 text-right">الحساب</th>
                      <th className="py-3 px-3 text-right">المبلغ</th>
                      <th className="py-3 px-3 text-right">العملة</th>
                      <th className="py-3 px-3 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {new Date(order.created_at!).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="py-3 px-3 text-gray-300">{order.customer_name}</td>
                        <td className="py-3 px-3 text-gray-400" dir="ltr">{order.customer_phone}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs max-w-[150px] truncate">
                          {order.customer_account}
                        </td>
                        <td className="py-3 px-3 font-bold" style={{ color: STORE.color }}>
                          {order.total_price?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-gray-500">{order.currency}</td>
                        <td className="py-3 px-3">
                          <span className="text-xs px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-400">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Package Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{
              background: "linear-gradient(145deg, #12121a, #1a1a28)",
              border: `1px solid ${STORE.color}30`,
            }}
          >
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 left-4 text-gray-500 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="font-display text-xl font-800 mb-5" style={{ color: STORE.color }}>
              {editingPkg ? "تعديل باقة" : "إضافة باقة جديدة"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">المنصة</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="admin-input"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">الخدمة</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="admin-input"
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">الكمية (مثال: 1000 أو 1K)</label>
                <input
                  type="text"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="مثال: 1000"
                  className="admin-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">السعر (ل.س)</label>
                  <input
                    type="number"
                    value={form.price_syp || ""}
                    onChange={(e) => setForm({ ...form, price_syp: Number(e.target.value) })}
                    className="admin-input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    value={form.price_egp || ""}
                    onChange={(e) => setForm({ ...form, price_egp: Number(e.target.value) })}
                    className="admin-input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">السعر ($)</label>
                  <input
                    type="number"
                    value={form.price_usd || ""}
                    onChange={(e) => setForm({ ...form, price_usd: Number(e.target.value) })}
                    className="admin-input"
                    dir="ltr"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">السعر (ر.س)</label>
                  <input
                    type="number"
                    value={form.price_sar || ""}
                    onChange={(e) => setForm({ ...form, price_sar: Number(e.target.value) })}
                    className="admin-input"
                    dir="ltr"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">ترتيب العرض</label>
                <input
                  type="number"
                  value={form.sort_order || 0}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="admin-input"
                  dir="ltr"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: STORE.color }}
                />
                <span className="text-gray-300">مفعّل (يظهر للعملاء)</span>
              </label>

              <button
                onClick={savePackage}
                className="neon-btn w-full py-3.5 rounded-xl font-bold text-lg mt-2"
              >
                {editingPkg ? "💾 حفظ التعديلات" : "➕ إضافة الباقة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
