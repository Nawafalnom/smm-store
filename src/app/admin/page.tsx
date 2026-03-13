"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, STORE, PLATFORMS, ORDER_STATUSES, type Category, type Service, type Order, type Profile, type Provider } from "@/lib/supabase";
import { getProviderServices, getProviderBalance, getMultiOrderStatus } from "@/lib/smm-api";
import toast from "react-hot-toast";
import Link from "next/link";

const A = STORE.accentColor;
const ADMIN_KEY = "gm_admin_auth";

// Type for API service from provider
interface ApiService {
  service: number; name: string; type: string; category: string;
  rate: string; min: string; max: string; refill: boolean; cancel: boolean;
  selected?: boolean;
}
interface ApiCategory { name: string; services: ApiService[]; selected: boolean; expanded: boolean; }

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"password" | "2fa" | "setup2fa">("password");
  const [totpCode, setTotpCode] = useState("");
  const [setup2FA, setSetup2FA] = useState<{ secret: string; qrUrl: string; configured: boolean; message: string } | null>(null);
  const [tab, setTab] = useState<"providers" | "categories" | "services" | "orders" | "users">("providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sync Selection Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProvider, setSyncProvider] = useState<Provider | null>(null);
  const [syncCategories, setSyncCategories] = useState<ApiCategory[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSearch, setSyncSearch] = useState("");

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
  const [svcForm, setSvcForm] = useState<Partial<Service>>({});

  // ── Read session on mount ──
  useEffect(() => {
    try {
      const val = window.localStorage.getItem(ADMIN_KEY);
      if (val === "1") {
        setAuthed(true);
      }
    } catch (e) {
      console.error("localStorage read error:", e);
    }
    setMounted(true);
  }, []);

  function doLogin() {
    try {
      window.localStorage.setItem(ADMIN_KEY, "1");
    } catch (e) {
      console.error("localStorage write error:", e);
    }
    setAuthed(true);
    toast.success("تم تسجيل الدخول");
  }

  function handleLogin() {
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123456";
    if (password !== adminPass) {
      toast.error("كلمة المرور غير صحيحة");
      return;
    }
    doLogin();
  }

  async function handleVerify2FA() {
    if (totpCode.length !== 6) { toast.error("أدخل 6 أرقام"); return; }
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify2fa", password, code: totpCode }),
      }).then(r => r.json());

      if (!res.success) { toast.error(res.error || "الكود غير صحيح"); return; }

      doLogin();
    } catch { toast.error("خطأ"); }
  }

  async function handleSetup2FA() {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup2fa", password }),
      }).then(r => r.json());

      if (res.success) { setSetup2FA(res); setLoginStep("setup2fa"); }
      else toast.error(res.error);
    } catch { toast.error("خطأ"); }
  }

  function handleLogout() {
    try { window.localStorage.removeItem(ADMIN_KEY); } catch {}
    setAuthed(false);
    setPassword("");
    setTotpCode("");
    setLoginStep("password");
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
    if (p.data) setProviders(p.data); if (c.data) setCategories(c.data);
    if (s.data) setServices(s.data); if (o.data) setOrders(o.data); if (u.data) setUsers(u.data);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);

  // ═══ SYNC: Step 1 - Fetch and show selection ═══
  async function openSyncModal(prov: Provider) {
    setSyncProvider(prov); setSyncLoading(true); setShowSyncModal(true); setSyncSearch("");
    try {
      const apiServices = await getProviderServices(prov.id!);
      if (!Array.isArray(apiServices)) { toast.error("فشل جلب الخدمات"); setShowSyncModal(false); return; }

      // Group by category
      const catMap: Record<string, ApiService[]> = {};
      for (const s of apiServices) {
        (catMap[s.category] = catMap[s.category] || []).push({ ...s, selected: false });
      }
      const cats: ApiCategory[] = Object.entries(catMap).map(([name, svcs]) => ({
        name, services: svcs, selected: false, expanded: false,
      }));
      setSyncCategories(cats);
    } catch { toast.error("خطأ في الاتصال"); setShowSyncModal(false); }
    finally { setSyncLoading(false); }
  }

  // Toggle category selection (selects/deselects all services inside)
  function toggleCatSelection(catIdx: number) {
    setSyncCategories(prev => prev.map((c, i) => {
      if (i !== catIdx) return c;
      const newSel = !c.selected;
      return { ...c, selected: newSel, services: c.services.map(s => ({ ...s, selected: newSel })) };
    }));
  }

  // Toggle single service
  function toggleSvcSelection(catIdx: number, svcIdx: number) {
    setSyncCategories(prev => prev.map((c, ci) => {
      if (ci !== catIdx) return c;
      const newSvcs = c.services.map((s, si) => si === svcIdx ? { ...s, selected: !s.selected } : s);
      return { ...c, services: newSvcs, selected: newSvcs.every(s => s.selected) };
    }));
  }

  // Toggle expand
  function toggleCatExpand(catIdx: number) {
    setSyncCategories(prev => prev.map((c, i) => i === catIdx ? { ...c, expanded: !c.expanded } : c));
  }

  // Select all / Deselect all
  function selectAllSync(val: boolean) {
    setSyncCategories(prev => prev.map(c => ({ ...c, selected: val, services: c.services.map(s => ({ ...s, selected: val })) })));
  }

  // Count selected
  const selectedCount = syncCategories.reduce((acc, c) => acc + c.services.filter(s => s.selected).length, 0);
  const totalCount = syncCategories.reduce((acc, c) => acc + c.services.length, 0);

  // ═══ SYNC: Step 2 - Import selected ═══
  async function importSelected() {
    if (!syncProvider || selectedCount === 0) { toast.error("اختر خدمات أولاً"); return; }
    setSyncing(true);
    try {
      const selectedServices: (ApiService & { catName: string })[] = [];
      for (const c of syncCategories) {
        for (const s of c.services) {
          if (s.selected) selectedServices.push({ ...s, catName: c.name });
        }
      }

      // Ensure categories exist
      const catNames = Array.from(new Set(selectedServices.map(s => s.catName)));
      for (const name of catNames) {
        const { data: ex } = await supabase.from("categories").select("id").eq("name", name).single();
        if (!ex) await supabase.from("categories").insert({ name, sort_order: 0, is_active: true });
      }
      const { data: allCats } = await supabase.from("categories").select("*");
      const catIdMap: Record<string, string> = {};
      (allCats || []).forEach((c: any) => { catIdMap[c.name] = c.id; });

      let added = 0, updated = 0;
      for (const s of selectedServices) {
        const { data: existing } = await supabase.from("services").select("id")
          .eq("api_service_id", s.service).eq("provider_id", syncProvider.id).single();

        const data = {
          api_service_id: s.service, provider_id: syncProvider.id, name: s.name,
          category_id: catIdMap[s.catName] || "", platform: s.catName,
          price_per_1000: Number(s.rate), min_quantity: Number(s.min), max_quantity: Number(s.max),
          can_refill: s.refill || false, can_cancel: s.cancel || false,
          speed: s.type || "Default", guarantee_days: 0,
          description: `${s.type} | $${s.rate}/1K${s.refill ? " | ♻️" : ""}${s.cancel ? " | ❌" : ""}`,
          is_active: true, sort_order: s.service,
        };

        if (existing) { await supabase.from("services").update(data).eq("id", existing.id); updated++; }
        else { await supabase.from("services").insert(data); added++; }
      }

      toast.success(`تم! ${added} جديد، ${updated} محدّث`);
      setShowSyncModal(false); fetchAll();
    } catch (err) { console.error(err); toast.error("خطأ"); }
    finally { setSyncing(false); }
  }

  // ═══ Other functions ═══
  async function refreshBalance(prov: Provider) {
    const res = await getProviderBalance(prov.id!);
    if (res?.balance) { await supabase.from("providers").update({ balance: Number(res.balance) }).eq("id", prov.id); toast.success(`$${Number(res.balance).toFixed(2)}`); fetchAll(); }
    else toast.error("فشل");
  }

  async function updateOrderStatuses() {
    setSyncing(true);
    try {
      const { data: pending } = await supabase.from("orders").select("*, service:services(provider_id)")
        .in("status", ["pending", "processing", "in_progress"]).neq("api_order_id", "").limit(100);
      if (!pending?.length) { toast("لا توجد طلبات"); setSyncing(false); return; }
      const byProv: Record<string, any[]> = {};
      for (const o of pending) { const p = (o as any).service?.provider_id; if (p) (byProv[p] = byProv[p] || []).push(o); }
      const sMap: Record<string, string> = { "Pending": "pending", "Processing": "processing", "In progress": "in_progress", "Completed": "completed", "Cancelled": "cancelled", "Partial": "partial", "Canceled": "cancelled" };
      let total = 0;
      for (const [pid, ords] of Object.entries(byProv)) {
        const st = await getMultiOrderStatus(pid, ords.map((o: any) => o.api_order_id));
        for (const o of ords) { const s = st?.[o.api_order_id]; if (s && !s.error) { await supabase.from("orders").update({ status: sMap[s.status] || o.status, start_count: Number(s.start_count) || 0, remains: Number(s.remains) || 0 }).eq("id", o.id); total++; } }
      }
      toast.success(`تم تحديث ${total} طلب`); fetchAll();
    } catch { toast.error("خطأ"); } finally { setSyncing(false); }
  }

  // ═══ Delete All ═══
  async function deleteAllCategories() {
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع الفئات؟ هذا سيحذف أيضاً ربط الخدمات بالفئات.")) return;
    if (!confirm("تأكيد نهائي: حذف " + categories.length + " فئة؟")) return;
    try {
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("تم حذف جميع الفئات"); fetchAll();
    } catch { toast.error("خطأ"); }
  }

  async function deleteAllServices() {
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع الخدمات؟")) return;
    if (!confirm("تأكيد نهائي: حذف " + services.length + " خدمة؟")) return;
    try {
      await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("تم حذف جميع الخدمات"); fetchAll();
    } catch { toast.error("خطأ"); }
  }

  async function deleteAllCategoriesAndServices() {
    if (!confirm("⚠️⚠️ هل أنت متأكد من حذف جميع الفئات والخدمات معاً؟ هذا لا يمكن التراجع عنه!")) return;
    if (!confirm("تأكيد نهائي: حذف " + services.length + " خدمة و " + categories.length + " فئة؟")) return;
    try {
      await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("تم حذف جميع الفئات والخدمات"); fetchAll();
    } catch { toast.error("خطأ"); }
  }

  async function saveProv() { try { if (editingProv?.id) await supabase.from("providers").update(provForm).eq("id", editingProv.id); else await supabase.from("providers").insert(provForm); toast.success("تم"); setShowProvForm(false); setEditingProv(null); setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteProv(id: string) { if (!confirm("حذف؟")) return; await supabase.from("providers").delete().eq("id", id); fetchAll(); }
  async function saveCat() { try { if (editingCat?.id) await supabase.from("categories").update(catForm).eq("id", editingCat.id); else await supabase.from("categories").insert(catForm); toast.success("تم"); setShowCatForm(false); setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteCat(id: string) { if (!confirm("حذف؟")) return; await supabase.from("categories").delete().eq("id", id); fetchAll(); }
  async function saveSvc() { try { if (editingSvc?.id) await supabase.from("services").update(svcForm).eq("id", editingSvc.id); else await supabase.from("services").insert(svcForm); toast.success("تم"); setShowSvcForm(false); setEditingSvc(null); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteSvc(id: string) { if (!confirm("حذف؟")) return; await supabase.from("services").delete().eq("id", id); fetchAll(); }
  async function updateOrderStatus(id: string, status: string) { await supabase.from("orders").update({ status }).eq("id", id); fetchAll(); }
  async function updateBalance(uid: string) { const v = prompt("الرصيد الجديد:"); if (!v) return; await supabase.from("profiles").update({ balance: Number(v) }).eq("id", uid); toast.success("تم"); fetchAll(); }

  // ── LOADING ──
  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${A}40`, borderTopColor: "transparent" }} />
    </div>
  );

  // ── LOGIN ──
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 bg-grid p-4" style={{ "--brand-rgb": STORE.colorRgb } as any}>
      <div className="w-full max-w-sm card-dark p-8 text-center">
        <h1 className="font-display text-2xl font-800 mb-1" style={{ color: A }}>Admin Panel</h1>
        <p className="text-gray-500 mb-6 text-sm">لوحة الإدارة</p>

        {/* Step 1: Password */}
        {loginStep === "password" && (
          <div className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="كلمة المرور" className="admin-input" dir="ltr" />
            <button onClick={handleLogin} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>دخول</button>
            <button onClick={handleSetup2FA} className="text-xs text-gray-600 hover:text-gray-400 transition">⚙️ إعداد المصادقة الثنائية</button>
          </div>
        )}

        {/* Step 2: 2FA Code */}
        {loginStep === "2fa" && (
          <div className="space-y-4">
            <div className="text-4xl mb-2">🔐</div>
            <p className="text-gray-400 text-sm mb-2">أدخل كود المصادقة الثنائية من تطبيق Google Authenticator</p>
            <input type="text" value={totpCode} maxLength={6}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerify2FA()}
              placeholder="000000" className="admin-input text-center !text-2xl !tracking-[0.5em] !font-mono" dir="ltr" />
            <button onClick={handleVerify2FA} disabled={totpCode.length !== 6}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40" style={{ background: A }}>
              تحقق
            </button>
            <button onClick={() => { setLoginStep("password"); setTotpCode(""); }} className="text-xs text-gray-500 hover:text-gray-300">← رجوع</button>
          </div>
        )}

        {/* Step: 2FA Setup */}
        {loginStep === "setup2fa" && setup2FA && (
          <div className="space-y-4 text-right">
            <div className="text-center">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="text-white font-bold mb-1">إعداد المصادقة الثنائية</h3>
              {setup2FA.configured ? (
                <p className="text-green-400 text-sm">✅ المصادقة الثنائية مفعّلة بالفعل</p>
              ) : (
                <p className="text-yellow-400 text-sm">⚠️ غير مفعّلة بعد</p>
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-sm mb-3">امسح هذا الكود بتطبيق Google Authenticator:</p>
              <img src={setup2FA.qrUrl} alt="QR Code" className="mx-auto rounded-lg mb-3" style={{ background: "white", padding: "8px" }} />
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">أو أدخل هذا السر يدوياً:</p>
              <div className="admin-input !bg-dark-800 text-xs font-mono text-center break-all" dir="ltr" onClick={(e) => {
                navigator.clipboard.writeText(setup2FA.secret); toast.success("تم النسخ!");
              }} style={{ cursor: "pointer" }}>
                {setup2FA.secret}
              </div>
              <p className="text-gray-600 text-xs mt-1">اضغط للنسخ</p>
            </div>

            {!setup2FA.configured && (
              <div className="rounded-xl p-3 text-xs text-right" style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
                <p className="text-yellow-400 font-bold mb-1">⚠️ خطوة مهمة:</p>
                <p className="text-gray-400">بعد مسح الكود، أضف هذا المتغير في <strong>Vercel → Settings → Environment Variables</strong>:</p>
                <div className="mt-2 admin-input !bg-dark-900 font-mono text-xs break-all" dir="ltr" onClick={() => {
                  navigator.clipboard.writeText(`ADMIN_TOTP_SECRET=${setup2FA.secret}`); toast.success("تم النسخ!");
                }} style={{ cursor: "pointer" }}>
                  ADMIN_TOTP_SECRET={setup2FA.secret}
                </div>
                <p className="text-gray-500 mt-1">ثم اعمل Redeploy</p>
              </div>
            )}

            <button onClick={() => { setLoginStep("password"); setSetup2FA(null); }} className="w-full py-2.5 rounded-xl font-bold text-sm border border-white/10 text-gray-400 hover:bg-white/5">← رجوع لتسجيل الدخول</button>
          </div>
        )}

        <Link href="/" className="block mt-4 text-sm text-gray-500">← المتجر</Link>
      </div>
    </div>
  );

  const TABS = [
    { k: "providers", l: "🔌 المزوّدين" }, { k: "categories", l: "📁 الفئات" },
    { k: "services", l: "📦 الخدمات" }, { k: "orders", l: "📋 الطلبات" }, { k: "users", l: "👥 المستخدمين" },
  ];

  // Filtered sync categories
  const filteredSyncCats = syncSearch.trim()
    ? syncCategories.map(c => ({ ...c, services: c.services.filter(s => s.name.toLowerCase().includes(syncSearch.toLowerCase()) || c.name.toLowerCase().includes(syncSearch.toLowerCase())) })).filter(c => c.services.length > 0)
    : syncCategories;

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": STORE.color, "--brand-rgb": STORE.colorRgb } as any}>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm">← الموقع</Link>
            <span className="font-display font-800" style={{ color: A }}>Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={updateOrderStatuses} disabled={syncing} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: "#3b82f6" }}>{syncing ? "..." : "📊 تحديث الطلبات"}</button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-sm">خروج</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${tab === t.k ? "text-white" : "text-gray-500"}`}
              style={tab === t.k ? { background: `${A}25`, color: A } : {}}>{t.l}</button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-500">جاري التحميل...</div>}

        {/* ═══ PROVIDERS ═══ */}
        {!loading && tab === "providers" && (<>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-300">المزوّدين</h2>
            <button onClick={() => { setEditingProv(null); setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); setShowProvForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ مزوّد</button>
          </div>
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="card-dark p-5">
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-white font-display font-800">{p.name}</span>
                    <span className={`mr-2 text-xs px-2 py-0.5 rounded ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{p.is_active ? "مفعّل" : "معطّل"}</span></div>
                  <div className="font-display font-bold" style={{ color: "#f59e0b" }}>${(p.balance || 0).toFixed(2)}</div>
                </div>
                <div className="text-gray-500 text-xs mb-3" dir="ltr">{p.api_url}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openSyncModal(p)} disabled={syncing} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">🔄 مزامنة الخدمات</button>
                  <button onClick={() => refreshBalance(p)} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400">💰 رصيد</button>
                  <button onClick={() => { setEditingProv(p); setProvForm({ ...p }); setShowProvForm(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400">تعديل</button>
                  <button onClick={() => deleteProv(p.id!)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">حذف</button>
                </div>
              </div>
            ))}
            {providers.length === 0 && <div className="card-dark p-12 text-center text-gray-500">لا يوجد مزوّدين</div>}
          </div>
        </>)}

        {/* ═══ CATEGORIES ═══ */}
        {!loading && tab === "categories" && (<>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-300">الفئات ({categories.length})</h2>
            <div className="flex gap-2">
              {categories.length > 0 && (<>
                <button onClick={deleteAllCategoriesAndServices} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition">🗑️ حذف الكل (فئات + خدمات)</button>
                <button onClick={deleteAllCategories} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition">حذف جميع الفئات</button>
              </>)}
              <button onClick={() => { setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); setShowCatForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ فئة</button>
            </div>
          </div>
          <div className="space-y-2">{categories.map((c) => (
            <div key={c.id} className="card-dark p-4 flex items-center justify-between">
              <div><span className="text-white font-bold">{c.name}</span> <span className={`mr-2 text-xs px-2 py-0.5 rounded ${c.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{c.is_active ? "✓" : "✗"}</span></div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCat(c); setCatForm({ ...c }); setShowCatForm(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400">تعديل</button>
                <button onClick={() => deleteCat(c.id!)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">حذف</button>
              </div>
            </div>
          ))}</div>
        </>)}

        {/* ═══ SERVICES ═══ */}
        {!loading && tab === "services" && (<>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-300">الخدمات ({services.length})</h2>
            <div className="flex gap-2">
              {services.length > 0 && (
                <button onClick={deleteAllServices} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition">🗑️ حذف جميع الخدمات</button>
              )}
              <button onClick={() => { setEditingSvc(null); setSvcForm({ category_id: "", provider_id: "", name: "", platform: "", api_service_id: 0, price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "Default", guarantee_days: 0, description: "", can_refill: false, can_cancel: false, is_active: true, sort_order: 0 }); setShowSvcForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ خدمة</button>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-white/5 text-gray-500">
              <th className="py-2 px-2 text-right">ID</th><th className="py-2 px-2 text-right">الاسم</th><th className="py-2 px-2 text-right">المزوّد</th>
              <th className="py-2 px-2 text-right">$/1K</th><th className="py-2 px-2 text-right">-</th>
            </tr></thead>
            <tbody>{services.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="py-2 px-2 text-gray-500 font-mono">{s.api_service_id}</td>
                <td className="py-2 px-2 text-gray-300 max-w-[250px] truncate">{s.name}</td>
                <td className="py-2 px-2 text-purple-400">{(s as any).provider?.name || "-"}</td>
                <td className="py-2 px-2 font-bold" style={{ color: A }}>${s.price_per_1000}</td>
                <td className="py-2 px-2 flex gap-1">
                  <button onClick={() => { setEditingSvc(s); setSvcForm({ ...s }); setShowSvcForm(true); }} className="px-2 py-1 rounded bg-blue-500/15 text-blue-400">✏️</button>
                  <button onClick={() => deleteSvc(s.id!)} className="px-2 py-1 rounded bg-red-500/15 text-red-400">🗑️</button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        </>)}

        {/* ═══ ORDERS ═══ */}
        {!loading && tab === "orders" && (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-white/5 text-gray-500">
              <th className="py-2 px-2 text-right">API#</th><th className="py-2 px-2 text-right">الخدمة</th>
              <th className="py-2 px-2 text-right">الكمية</th><th className="py-2 px-2 text-right">$</th>
              <th className="py-2 px-2 text-right">الحالة</th><th className="py-2 px-2 text-right">التاريخ</th>
            </tr></thead>
            <tbody>{orders.map((o) => { const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending; return (
              <tr key={o.id} className="border-b border-white/5">
                <td className="py-2 px-2 text-gray-500 font-mono">{o.api_order_id || o.id?.slice(0, 8)}</td>
                <td className="py-2 px-2 text-gray-300">{(o as any).service?.name || "-"}</td>
                <td className="py-2 px-2 text-white">{o.quantity}</td>
                <td className="py-2 px-2 font-bold" style={{ color: A }}>${o.price.toFixed(2)}</td>
                <td className="py-2 px-2"><select value={o.status} onChange={(e) => updateOrderStatus(o.id!, e.target.value)} className="rounded px-1 py-0.5 bg-dark-700 border-0 text-xs" style={{ color: st.color }}>
                  {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></td>
                <td className="py-2 px-2 text-gray-500">{new Date(o.created_at!).toLocaleDateString("ar-EG")}</td>
              </tr>); })}</tbody>
          </table></div>
        )}

        {/* ═══ USERS ═══ */}
        {!loading && tab === "users" && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-white/5 text-gray-500">
              <th className="py-2 px-2 text-right">المستخدم</th><th className="py-2 px-2 text-right">الرصيد</th>
              <th className="py-2 px-2 text-right">الإنفاق</th><th className="py-2 px-2 text-right">-</th>
            </tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="py-2 px-2 text-white font-bold">{u.username}</td>
                <td className="py-2 px-2" style={{ color: STORE.color }}>${u.balance.toFixed(2)}</td>
                <td className="py-2 px-2 text-gray-400">${u.total_spent.toFixed(2)}</td>
                <td className="py-2 px-2"><button onClick={() => updateBalance(u.id)} className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">تعديل الرصيد</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ SYNC SELECTION MODAL ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => !syncing && setShowSyncModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: "#12121a", border: `1px solid ${A}30` }}>

            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-display text-lg font-800 text-white">🔄 مزامنة من {syncProvider?.name}</h2>
                <p className="text-gray-500 text-sm mt-1">اختر الفئات والخدمات التي تريد استيرادها</p>
              </div>
              <button onClick={() => !syncing && setShowSyncModal(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Search + Actions */}
            <div className="p-4 border-b border-white/5 shrink-0">
              <div className="flex gap-3 items-center mb-3">
                <input type="search" value={syncSearch} onChange={(e) => setSyncSearch(e.target.value)} placeholder="بحث عن خدمة أو فئة..." className="admin-input flex-1" />
                <span className="text-gray-400 text-sm whitespace-nowrap">{selectedCount}/{totalCount}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => selectAllSync(true)} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400">✅ تحديد الكل</button>
                <button onClick={() => selectAllSync(false)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">❌ إلغاء الكل</button>
              </div>
            </div>

            {/* Categories & Services List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {syncLoading ? (
                <div className="text-center py-12 text-gray-500">جاري جلب الخدمات من المزوّد...</div>
              ) : filteredSyncCats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">لا توجد نتائج</div>
              ) : filteredSyncCats.map((cat, ci) => {
                const origIdx = syncCategories.findIndex(c => c.name === cat.name);
                const selectedInCat = cat.services.filter(s => s.selected).length;
                return (
                  <div key={cat.name} className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a40" }}>
                    {/* Category Header */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition" onClick={() => toggleCatExpand(origIdx)}>
                      <input type="checkbox" checked={cat.selected} onChange={(e) => { e.stopPropagation(); toggleCatSelection(origIdx); }}
                        className="w-4 h-4 rounded" style={{ accentColor: A }} onClick={(e) => e.stopPropagation()} />
                      <span className="text-white font-bold flex-1">{cat.name}</span>
                      <span className="text-gray-500 text-xs">{selectedInCat}/{cat.services.length} خدمة</span>
                      <span className="text-gray-500">{cat.expanded ? "▲" : "▼"}</span>
                    </div>

                    {/* Services */}
                    {cat.expanded && (
                      <div className="border-t border-white/5 bg-dark-900/50">
                        {cat.services.map((svc, si) => {
                          const origSi = syncCategories[origIdx].services.findIndex(s => s.service === svc.service);
                          return (
                            <label key={svc.service} className="flex items-center gap-3 px-6 py-2 hover:bg-white/[0.02] cursor-pointer transition text-sm">
                              <input type="checkbox" checked={svc.selected} onChange={() => toggleSvcSelection(origIdx, origSi)}
                                className="w-3.5 h-3.5 rounded" style={{ accentColor: A }} />
                              <span className="text-gray-400 font-mono text-xs w-12">{svc.service}</span>
                              <span className="text-gray-300 flex-1 truncate">{svc.name}</span>
                              <span className="text-xs font-bold" style={{ color: A }}>${svc.rate}/1K</span>
                              <span className="text-gray-600 text-xs">{svc.min}-{svc.max}</span>
                              {svc.refill && <span className="text-xs text-green-400">♻️</span>}
                              {svc.cancel && <span className="text-xs text-red-400">❌</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 shrink-0 flex items-center justify-between">
              <span className="text-gray-400 text-sm">تم اختيار <strong className="text-white">{selectedCount}</strong> خدمة</span>
              <div className="flex gap-3">
                <button onClick={() => setShowSyncModal(false)} disabled={syncing} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 border border-white/10 hover:bg-white/5 disabled:opacity-50">إلغاء</button>
                <button onClick={importSelected} disabled={syncing || selectedCount === 0}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition"
                  style={{ background: selectedCount > 0 ? A : "#555" }}>
                  {syncing ? "جاري الاستيراد..." : `استيراد ${selectedCount} خدمة`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROVIDER MODAL ═══ */}
      {showProvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProvForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingProv ? "تعديل" : "إضافة"} مزوّد</h2>
            <div className="space-y-3">
              <div><label className="text-gray-400 text-sm">الاسم</label><input value={provForm.name || ""} onChange={(e) => setProvForm({ ...provForm, name: e.target.value })} className="admin-input" /></div>
              <div><label className="text-gray-400 text-sm">API URL</label><input value={provForm.api_url || ""} onChange={(e) => setProvForm({ ...provForm, api_url: e.target.value })} className="admin-input" dir="ltr" /></div>
              <div><label className="text-gray-400 text-sm">API Key</label><input value={provForm.api_key || ""} onChange={(e) => setProvForm({ ...provForm, api_key: e.target.value })} className="admin-input" dir="ltr" /></div>
              <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={provForm.is_active} onChange={(e) => setProvForm({ ...provForm, is_active: e.target.checked })} /> مفعّل</label>
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
              <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} /> مفعّل</label>
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
              <select value={svcForm.provider_id || ""} onChange={(e) => setSvcForm({ ...svcForm, provider_id: e.target.value })} className="admin-input"><option value="">المزوّد...</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={svcForm.category_id || ""} onChange={(e) => setSvcForm({ ...svcForm, category_id: e.target.value })} className="admin-input"><option value="">الفئة...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input value={svcForm.name || ""} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="الاسم" className="admin-input" />
              <input type="number" value={svcForm.api_service_id || 0} onChange={(e) => setSvcForm({ ...svcForm, api_service_id: Number(e.target.value) })} placeholder="API ID" className="admin-input" dir="ltr" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.001" value={svcForm.price_per_1000 || ""} onChange={(e) => setSvcForm({ ...svcForm, price_per_1000: Number(e.target.value) })} placeholder="$/1K" className="admin-input" dir="ltr" />
                <input type="number" value={svcForm.min_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, min_quantity: Number(e.target.value) })} placeholder="أقل" className="admin-input" dir="ltr" />
                <input type="number" value={svcForm.max_quantity || ""} onChange={(e) => setSvcForm({ ...svcForm, max_quantity: Number(e.target.value) })} placeholder="أعلى" className="admin-input" dir="ltr" />
                <input value={svcForm.speed || ""} onChange={(e) => setSvcForm({ ...svcForm, speed: e.target.value })} placeholder="السرعة" className="admin-input" />
              </div>
              <textarea value={svcForm.description || ""} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="الوصف" className="admin-input !h-16" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.is_active} onChange={(e) => setSvcForm({ ...svcForm, is_active: e.target.checked })} /> مفعّل</label>
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.can_refill || false} onChange={(e) => setSvcForm({ ...svcForm, can_refill: e.target.checked })} /> ♻️</label>
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.can_cancel || false} onChange={(e) => setSvcForm({ ...svcForm, can_cancel: e.target.checked })} /> ❌</label>
              </div>
              <button onClick={saveSvc} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
