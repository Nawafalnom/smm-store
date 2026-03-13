"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, STORE, PLATFORMS, ORDER_STATUSES, DEPOSIT_STATUSES, PAYMENT_METHODS, type Category, type Service, type Order, type Profile, type Provider, type Deposit } from "@/lib/supabase";
import { getProviderServices, getProviderBalance } from "@/lib/smm-api";
import { translateToArabic, translateCategory } from "@/lib/translate";
import toast from "react-hot-toast";
import Link from "next/link";

const A = STORE.accentColor;
const P = STORE.color;

interface ApiService {
  service: number; name: string; type: string; category: string;
  rate: string; min: string; max: string; refill: boolean; cancel: boolean;
  desc?: string; description?: string; dripfeed?: boolean; average_time?: string;
  selected?: boolean;
}
interface ApiCategory { name: string; services: ApiService[]; selected: boolean; expanded: boolean; }
interface Ticket { id: string; user_id: string; subject: string; message: string; status: string; priority: string; admin_reply: string; created_at: string; updated_at: string; }
interface Notification { id: string; type: string; title: string; message: string; is_read: boolean; metadata: any; created_at: string; }

function today() { return new Date().toISOString().split("T")[0]; }
function formatDate(d: string) { return new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} ي`;
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "reports" | "providers" | "categories" | "services" | "orders" | "users" | "tickets" | "notifications" | "deposits">("dashboard");

  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminDeposits, setAdminDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProvider, setSyncProvider] = useState<Provider | null>(null);
  const [syncCategories, setSyncCategories] = useState<ApiCategory[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSearch, setSyncSearch] = useState("");

  const [showProvForm, setShowProvForm] = useState(false);
  const [editingProv, setEditingProv] = useState<Provider | null>(null);
  const [provForm, setProvForm] = useState<Partial<Provider>>({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 });
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<Partial<Category>>({ name: "", sort_order: 0, is_active: true });
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState<Partial<Service>>({});
  const [showTicketReply, setShowTicketReply] = useState<Ticket | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [priceFixedAdd, setPriceFixedAdd] = useState(0);
  const [pricePctAdd, setPricePctAdd] = useState(0);

  // ═══════════════════════════════════════
  //  AUTH — httpOnly cookie server session
  // ═══════════════════════════════════════
  useEffect(() => {
    setMounted(true);
    fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    })
      .then(r => r.json())
      .then(d => { if (d.success) setAuthed(true); })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handleLogin() {
    if (!password.trim()) { toast.error("أدخل كلمة المرور"); return; }
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      }).then(r => r.json());
      if (res.success) { setAuthed(true); toast.success("تم تسجيل الدخول ✓"); }
      else toast.error(res.error || "كلمة المرور غير صحيحة");
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setLoginLoading(false); }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    setAuthed(false);
    setPassword("");
    toast.success("تم تسجيل الخروج");
  }

  // ═══════════════════════════════════════
  //  FETCH ALL DATA
  // ═══════════════════════════════════════
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, c, s, o, ao, u, t, n, dep] = await Promise.all([
      supabase.from("providers").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("services").select("*, category:categories(name), provider:providers(name)").order("sort_order"),
      supabase.from("orders").select("*, service:services(name, provider_id, price_per_1000, provider:providers(name)), profile:profiles(username)").order("created_at", { ascending: false }).limit(200),
      supabase.from("orders").select("id, user_id, price, status, created_at, quantity, service_id").order("created_at", { ascending: false }).limit(5000),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100).then(r => r, () => ({ data: null, error: null })),
      supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(50).then(r => r, () => ({ data: null, error: null })),
      supabase.from("deposits").select("*, profile:profiles(username)").order("created_at", { ascending: false }).limit(200).then(r => r, () => ({ data: null, error: null })),
    ]);
    if (p.data) setProviders(p.data);
    if (c.data) setCategories(c.data);
    if (s.data) setServices(s.data);
    if (o.data) setOrders(o.data as any);
    if (ao.data) setAllOrders(ao.data as any);
    if (u.data) setUsers(u.data);
    if ((t as any).data) setTickets((t as any).data || []);
    if ((n as any).data) setNotifications((n as any).data || []);
    if ((dep as any).data) setAdminDeposits((dep as any).data || []);
    setLoading(false);
  }, []);

  // Silent refresh — just orders (no loading spinner)
  const silentRefreshOrders = useCallback(async () => {
    const [o, ao] = await Promise.all([
      supabase.from("orders").select("*, service:services(name, provider_id, price_per_1000, provider:providers(name)), profile:profiles(username)").order("created_at", { ascending: false }).limit(200),
      supabase.from("orders").select("id, user_id, price, status, created_at, quantity, service_id").order("created_at", { ascending: false }).limit(5000),
    ]);
    if (o.data) setOrders(o.data as any);
    if (ao.data) setAllOrders(ao.data as any);
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);

  // Auto-refresh orders every 15 seconds + trigger cron every 60 seconds
  useEffect(() => {
    if (!authed) return;
    // Refresh order data from DB every 15 seconds (silent, no spinner)
    const refreshInterval = setInterval(() => { silentRefreshOrders(); }, 15000);
    // Trigger server-side cron to update from providers every 60 seconds
    const cronInterval = setInterval(() => {
      fetch("/api/cron/update-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "growence-cron-2024" }),
      }).catch(() => {});
    }, 60000);
    return () => { clearInterval(refreshInterval); clearInterval(cronInterval); };
  }, [authed, silentRefreshOrders]);

  // ═══════════════════════════════════════
  //  COMPUTED STATS
  // ═══════════════════════════════════════
  const stats = useMemo(() => {
    const todayStr = today();
    const todayOrders = allOrders.filter(o => o.created_at?.startsWith(todayStr));
    const failedOrders = allOrders.filter(o => ["cancelled", "partial"].includes(o.status));
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.price || 0), 0);
    const totalRevenue = allOrders.reduce((s, o) => s + (o.price || 0), 0);
    const todayUsers = new Set(todayOrders.map(o => o.user_id)).size;
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    const svcCount: Record<string, number> = {};
    todayOrders.forEach(o => { svcCount[o.service_id] = (svcCount[o.service_id] || 0) + 1; });
    const topServices = Object.entries(svcCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([sid, count]) => ({ name: services.find(s => s.id === sid)?.name || sid.slice(0, 8), count }));

    const userOrderCount: Record<string, number> = {};
    allOrders.forEach(o => { userOrderCount[o.user_id] = (userOrderCount[o.user_id] || 0) + 1; });
    const activeUsers = Object.entries(userOrderCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([uid, count]) => ({ name: users.find(u => u.id === uid)?.username || uid.slice(0, 8), count }));

    const topSpenders = [...users].sort((a, b) => b.total_spent - a.total_spent).slice(0, 5);

    const months: { label: string; orders: number; revenue: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ar-EG", { month: "short" });
      const mo = allOrders.filter(o => o.created_at?.startsWith(ym));
      const rev = mo.reduce((s, o) => s + (o.price || 0), 0);
      months.push({ label, orders: mo.length, revenue: rev, profit: rev * 0.3 });
    }

    return {
      totalUsers: users.length, totalOrders: allOrders.length, failedOrders: failedOrders.length,
      openTickets: tickets.filter(t => t.status === "open").length,
      todayOrders: todayOrders.length, todayRevenue, todayUsers, avgOrderValue, totalRevenue,
      topServices, activeUsers, topSpenders, months,
      unreadNotifs: notifications.filter(n => !n.is_read).length,
      newUsersToday: users.filter(u => u.created_at?.startsWith(todayStr)).length,
    };
  }, [allOrders, services, users, tickets, notifications]);

  // ═══════════════════════════════════════
  //  SYNC & CRUD FUNCTIONS
  // ═══════════════════════════════════════
  async function openSyncModal(prov: Provider) {
    setSyncProvider(prov); setSyncLoading(true); setShowSyncModal(true); setSyncSearch("");
    setPriceFixedAdd(0); setPricePctAdd(0);
    try {
      const apiServices = await getProviderServices(prov.id!);
      if (!Array.isArray(apiServices)) { toast.error("فشل جلب الخدمات"); setShowSyncModal(false); return; }
      const catMap: Record<string, ApiService[]> = {};
      for (const s of apiServices) (catMap[s.category] = catMap[s.category] || []).push({ ...s, selected: false });
      setSyncCategories(Object.entries(catMap).map(([name, svcs]) => ({ name, services: svcs, selected: false, expanded: false })));
    } catch { toast.error("خطأ في الاتصال"); setShowSyncModal(false); }
    finally { setSyncLoading(false); }
  }
  function toggleCatSelection(ci: number) { setSyncCategories(p => p.map((c, i) => { if (i !== ci) return c; const ns = !c.selected; return { ...c, selected: ns, services: c.services.map(s => ({ ...s, selected: ns })) }; })); }
  function toggleSvcSelection(ci: number, si: number) { setSyncCategories(p => p.map((c, i) => { if (i !== ci) return c; const ns = c.services.map((s, j) => j === si ? { ...s, selected: !s.selected } : s); return { ...c, services: ns, selected: ns.every(s => s.selected) }; })); }
  function toggleCatExpand(ci: number) { setSyncCategories(p => p.map((c, i) => i === ci ? { ...c, expanded: !c.expanded } : c)); }
  function selectAllSync(v: boolean) { setSyncCategories(p => p.map(c => ({ ...c, selected: v, services: c.services.map(s => ({ ...s, selected: v })) }))); }
  const selectedCount = syncCategories.reduce((a, c) => a + c.services.filter(s => s.selected).length, 0);
  const totalCount = syncCategories.reduce((a, c) => a + c.services.length, 0);

  async function importSelected() {
    if (!syncProvider || selectedCount === 0) { toast.error("اختر خدمات أولاً"); return; }
    setSyncing(true);
    try {
      const sel: (ApiService & { catName: string })[] = [];
      for (const c of syncCategories) for (const s of c.services) if (s.selected) sel.push({ ...s, catName: c.name });
      const catNames = Array.from(new Set(sel.map(s => s.catName)));

      // Ensure categories exist (with translation if enabled)
      for (const origName of catNames) {
        // Check if category already exists by name_en or name
        const { data: byEn } = await supabase.from("categories").select("id").eq("name_en", origName).single();
        if (byEn) continue;
        const { data: byName } = await supabase.from("categories").select("id").eq("name", origName).single();
        if (byName) { await supabase.from("categories").update({ name_en: origName }).eq("id", byName.id); continue; }

        const translatedName = autoTranslate ? translateCategory(origName) : origName;
        // Also check if translated name already exists
        if (autoTranslate && translatedName !== origName) {
          const { data: byTr } = await supabase.from("categories").select("id").eq("name", translatedName).single();
          if (byTr) { await supabase.from("categories").update({ name_en: origName }).eq("id", byTr.id); continue; }
        }
        await supabase.from("categories").insert({ name: translatedName, name_en: origName, sort_order: 0, is_active: true });
      }

      // Build category ID map (by name_en for accurate matching)
      const { data: allCats } = await supabase.from("categories").select("*");
      const catIdMap: Record<string, string> = {};
      (allCats || []).forEach((c: any) => {
        if (c.name_en) catIdMap[c.name_en] = c.id;
        catIdMap[c.name] = c.id;
      });

      let added = 0, updated = 0;
      for (const s of sel) {
        const { data: existing } = await supabase.from("services").select("id").eq("api_service_id", s.service).eq("provider_id", syncProvider.id).single();
        const translatedName = autoTranslate ? translateToArabic(s.name) : s.name;
        const apiPrice = Number(s.rate);
        const sellPrice = Math.round((apiPrice + priceFixedAdd + (apiPrice * pricePctAdd / 100)) * 10000) / 10000;

        // Use provider's real description if available
        const providerDesc = (s.desc || s.description || "").trim();
        let finalDesc = "";
        if (providerDesc && providerDesc.length > 2) {
          // Decode HTML entities in description too
          finalDesc = providerDesc
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
            .replace(/<[^>]*>/g, ""); // Strip HTML tags
        }

        // Extract guarantee days from name
        const guarMatch = s.name.match(/(\d+)\s*days?\s*(?:refill|guarantee|warranty)/i);
        const guarDays = guarMatch ? Number(guarMatch[1]) : (s.name.match(/lifetime/i) ? 999 : 0);

        const data: any = {
          api_service_id: s.service, provider_id: syncProvider.id,
          name: translatedName, name_en: s.name,
          category_id: catIdMap[s.catName] || "",
          platform: s.catName,
          price_per_1000: sellPrice, min_quantity: Number(s.min), max_quantity: Number(s.max),
          can_refill: s.refill || false, can_cancel: s.cancel || false,
          speed: s.type || "Default", guarantee_days: guarDays,
          description: finalDesc,
          is_active: true, sort_order: s.service,
        };
        if (existing) { await supabase.from("services").update(data).eq("id", existing.id); updated++; }
        else { await supabase.from("services").insert(data); added++; }
      }
      const pricingMsg = (priceFixedAdd > 0 || pricePctAdd > 0) ? ` | ربح: +$${priceFixedAdd} +${pricePctAdd}%` : "";
      const translateMsg = autoTranslate ? " (ترجمة ✓)" : "";
      toast.success(`تم! ${added} جديد، ${updated} محدّث${translateMsg}${pricingMsg}`); setShowSyncModal(false); fetchAll();
    } catch (err) { console.error(err); toast.error("خطأ"); } finally { setSyncing(false); }
  }

  async function refreshBalance(prov: Provider) { const res = await getProviderBalance(prov.id!); if (res?.balance) { await supabase.from("providers").update({ balance: Number(res.balance) }).eq("id", prov.id); toast.success(`$${Number(res.balance).toFixed(2)}`); fetchAll(); } else toast.error("فشل"); }

  async function updateOrderStatuses() {
    setSyncing(true);
    try {
      const res = await fetch("/api/cron/update-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "growence-cron-2024" }),
      }).then(r => r.json());

      if (res.success) {
        toast.success(`تم تحديث ${res.updated} طلب من أصل ${res.total} (${res.elapsed})`);
        if (res.errors > 0) toast(`⚠️ ${res.errors} أخطاء`, { icon: "⚠️" });
        fetchAll();
      } else {
        toast.error(res.error || "فشل التحديث");
        console.error("Cron result:", res);
      }
    } catch (err) { toast.error("خطأ في الاتصال"); console.error(err); }
    finally { setSyncing(false); }
  }

  async function deleteAllCategories() { if (!confirm("⚠️ حذف جميع الفئات؟")) return; if (!confirm("تأكيد نهائي؟")) return; await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000"); toast.success("تم"); fetchAll(); }
  async function deleteAllServices() { if (!confirm("⚠️ حذف جميع الخدمات؟")) return; if (!confirm("تأكيد نهائي؟")) return; await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000"); toast.success("تم"); fetchAll(); }
  async function deleteAllCategoriesAndServices() { if (!confirm("⚠️⚠️ حذف الكل؟")) return; if (!confirm("تأكيد نهائي؟")) return; await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000"); await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000"); toast.success("تم"); fetchAll(); }
  async function saveProv() { try { if (editingProv?.id) await supabase.from("providers").update(provForm).eq("id", editingProv.id); else await supabase.from("providers").insert(provForm); toast.success("تم"); setShowProvForm(false); setEditingProv(null); setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteProv(id: string) { if (!confirm("حذف؟")) return; await supabase.from("providers").delete().eq("id", id); fetchAll(); }
  async function saveCat() { try { if (editingCat?.id) await supabase.from("categories").update(catForm).eq("id", editingCat.id); else await supabase.from("categories").insert(catForm); toast.success("تم"); setShowCatForm(false); setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteCat(id: string) { if (!confirm("حذف؟")) return; await supabase.from("categories").delete().eq("id", id); fetchAll(); }
  async function saveSvc() { try { if (editingSvc?.id) await supabase.from("services").update(svcForm).eq("id", editingSvc.id); else await supabase.from("services").insert(svcForm); toast.success("تم"); setShowSvcForm(false); setEditingSvc(null); fetchAll(); } catch { toast.error("خطأ"); } }
  async function deleteSvc(id: string) { if (!confirm("حذف؟")) return; await supabase.from("services").delete().eq("id", id); fetchAll(); }

  // Translate all existing English services/categories to Arabic
  async function translateAllExisting() {
    if (!confirm("هل تريد ترجمة جميع الخدمات والفئات الإنجليزية للعربي؟")) return;
    setSyncing(true);
    let translated = 0;
    try {
      // Translate categories
      for (const cat of categories) {
        const isEng = !/[\u0600-\u06FF]/.test(cat.name);
        if (isEng) {
          const arName = translateCategory(cat.name);
          await supabase.from("categories").update({ name: arName, name_en: cat.name }).eq("id", cat.id);
          translated++;
        } else if (!(cat as any).name_en) {
          // Already Arabic but no English backup — skip
        }
      }
      // Translate services
      for (const svc of services) {
        const isEng = !/[\u0600-\u06FF]/.test(svc.name);
        if (isEng) {
          const arName = translateToArabic(svc.name);
          await supabase.from("services").update({ name: arName, name_en: svc.name }).eq("id", svc.id);
          translated++;
        } else if (!(svc as any).name_en) {
          // Already Arabic but no English backup — skip
        }
      }
      toast.success(`تم ترجمة ${translated} عنصر ✓`);
      fetchAll();
    } catch (err) { console.error(err); toast.error("خطأ في الترجمة"); }
    finally { setSyncing(false); }
  }
  async function updateOrderStatus(id: string, status: string) { await supabase.from("orders").update({ status }).eq("id", id); fetchAll(); }
  async function updateBalance(uid: string) { const v = prompt("الرصيد الجديد:"); if (!v) return; await supabase.from("profiles").update({ balance: Number(v) }).eq("id", uid); toast.success("تم"); fetchAll(); }

  async function replyTicket() {
    if (!showTicketReply || !ticketReply.trim()) return;
    await supabase.from("support_tickets").update({ admin_reply: ticketReply, status: "resolved", updated_at: new Date().toISOString() }).eq("id", showTicketReply.id);
    toast.success("تم الرد"); setShowTicketReply(null); setTicketReply(""); fetchAll();
  }
  async function updateTicketStatus(id: string, status: string) { await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id); fetchAll(); }
  async function markNotifRead(id: string) { await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id); setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n)); }
  async function markAllRead() { await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false); setNotifications(p => p.map(n => ({ ...n, is_read: true }))); toast.success("تم"); }
  async function clearNotifs() { if (!confirm("حذف جميع الإشعارات؟")) return; await supabase.from("admin_notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000"); setNotifications([]); toast.success("تم"); }

  // Deposit management
  async function approveDeposit(dep: Deposit) {
    if (!confirm(`قبول طلب شحن $${dep.amount} ؟ سيتم إضافة الرصيد للمستخدم.`)) return;
    try {
      // 1. Update deposit status
      await supabase.from("deposits").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", dep.id);
      // 2. Add balance to user
      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", dep.user_id).single();
      if (profile) {
        await supabase.from("profiles").update({ balance: profile.balance + dep.amount }).eq("id", dep.user_id);
      }
      toast.success(`تم قبول الشحن ✓ — أضيف $${dep.amount} للمستخدم`);
      fetchAll();
    } catch (err) { toast.error("خطأ"); console.error(err); }
  }

  async function rejectDeposit(dep: Deposit) {
    const reason = prompt("سبب الرفض (اختياري):");
    await supabase.from("deposits").update({ status: "rejected", admin_note: reason || "", updated_at: new Date().toISOString() }).eq("id", dep.id);
    toast.success("تم رفض الطلب");
    fetchAll();
  }

  // ═══════════════════════════════════════
  //  BAR CHART SVG
  // ═══════════════════════════════════════
  function BarChart({ data, dataKey, color, label }: { data: { label: string;[k: string]: any }[]; dataKey: string; color: string; label: string }) {
    const max = Math.max(...data.map(d => d[dataKey]), 1);
    return (
      <div>
        <div className="text-xs text-gray-500 mb-3 font-bold">{label}</div>
        <div className="flex items-end gap-2 h-36">
          {data.map((d, i) => {
            const h = (d[dataKey] / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold" style={{ color }}>{d[dataKey] > 0 ? (dataKey === "revenue" || dataKey === "profit" ? `$${d[dataKey].toFixed(0)}` : d[dataKey]) : ""}</span>
                <div className="w-full rounded-t-lg transition-all duration-700 ease-out" style={{ height: `${Math.max(h, 3)}%`, background: `linear-gradient(to top, ${color}25, ${color})`, boxShadow: `0 0 12px ${color}30` }} />
                <span className="text-[10px] text-gray-500">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  LOADING STATE
  // ═══════════════════════════════════════
  if (!mounted || checkingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: `${A}40`, borderTopColor: "transparent" }} />
        <p className="text-gray-500 text-sm">جاري التحقق...</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 bg-grid p-4" style={{ "--brand-rgb": STORE.colorRgb } as any}>
      <div className="w-full max-w-sm card-dark p-8 text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[80px] pointer-events-none" style={{ background: A, opacity: 0.15 }} />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl" style={{ background: `${A}15`, border: `1px solid ${A}30` }}>🛡️</div>
          <h1 className="font-display text-2xl font-800 mb-1" style={{ color: A }}>Admin Panel</h1>
          <p className="text-gray-500 mb-6 text-sm">لوحة إدارة {STORE.nameAr}</p>
          <div className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="كلمة المرور" className="admin-input text-center" dir="ltr" autoFocus />
            <button onClick={handleLogin} disabled={loginLoading} className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:brightness-110 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${A}, ${A}cc)` }}>
              {loginLoading ? "جاري الدخول..." : "دخول ←"}
            </button>
          </div>
          <Link href="/" className="block mt-5 text-sm text-gray-600 hover:text-gray-400 transition">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  //  MAIN DASHBOARD LAYOUT
  // ═══════════════════════════════════════
  const TABS = [
    { k: "dashboard", l: "📊 الرئيسية", badge: 0 },
    { k: "reports", l: "📈 التقارير", badge: 0 },
    { k: "notifications", l: "🔔 إشعارات", badge: stats.unreadNotifs },
    { k: "providers", l: "🔌 المزوّدين", badge: 0 },
    { k: "categories", l: "📁 الفئات", badge: 0 },
    { k: "services", l: "📦 الخدمات", badge: services.length },
    { k: "orders", l: "📋 الطلبات", badge: orders.length },
    { k: "users", l: "👥 المستخدمين", badge: users.length },
    { k: "tickets", l: "🎫 التذاكر", badge: stats.openTickets },
    { k: "deposits", l: "💳 الشحن", badge: adminDeposits.filter(d => d.status === "pending").length },
  ];

  const filteredSyncCats = syncSearch.trim()
    ? syncCategories.map(c => ({ ...c, services: c.services.filter(s => s.name.toLowerCase().includes(syncSearch.toLowerCase()) || c.name.toLowerCase().includes(syncSearch.toLowerCase())) })).filter(c => c.services.length > 0)
    : syncCategories;

  const NI: Record<string, string> = { new_order: "🛒", new_user: "👤", failed_order: "❌", new_ticket: "🎫", low_balance: "💰" };
  const NC: Record<string, string> = { new_order: "#10b981", new_user: "#3b82f6", failed_order: "#ef4444", new_ticket: "#f59e0b", low_balance: "#f97316" };
  const TS: Record<string, { l: string; c: string }> = { open: { l: "مفتوحة", c: "#f59e0b" }, in_progress: { l: "قيد المعالجة", c: "#3b82f6" }, resolved: { l: "تم الحل", c: "#10b981" }, closed: { l: "مغلقة", c: "#6b7280" } };
  const TP: Record<string, { l: string; c: string }> = { low: { l: "منخفض", c: "#6b7280" }, normal: { l: "عادي", c: "#3b82f6" }, high: { l: "عالي", c: "#f59e0b" }, urgent: { l: "عاجل", c: "#ef4444" } };
  const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32", "#666", "#555"];

  return (
    <div className="min-h-screen bg-dark-900" style={{ "--brand-color": STORE.color, "--brand-rgb": STORE.colorRgb } as any}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm transition">← الموقع</Link>
            <div className="w-px h-5 bg-white/10" />
            <span className="font-display font-800 text-lg" style={{ color: A }}>Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-bold">LIVE 15s</span>
            </div>
            <button onClick={updateOrderStatuses} disabled={syncing} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition hover:brightness-110" style={{ background: "#3b82f6" }}>{syncing ? "⏳" : "🔄"} تحديث الطلبات</button>
            <button onClick={fetchAll} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition">♻️</button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-sm transition">خروج</button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1.5 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.k ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              style={tab === t.k ? { background: `${A}20`, color: A, boxShadow: `0 0 20px ${A}10` } : {}}>
              {t.l}
              {t.badge > 0 && <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center text-white px-1 font-bold" style={{ background: t.k === "notifications" ? "#ef4444" : A }}>{t.badge > 99 ? "99+" : t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading && <div className="text-center py-16 text-gray-500"><div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: `${A}40`, borderTopColor: "transparent" }} />جاري التحميل...</div>}

        {/* ═══ DASHBOARD OVERVIEW ═══ */}
        {!loading && tab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "المستخدمين", value: stats.totalUsers, icon: "👥", color: "#3b82f6", sub: `+${stats.newUsersToday} اليوم` },
                { label: "إجمالي الطلبات", value: stats.totalOrders, icon: "📦", color: "#8b5cf6", sub: `${stats.todayOrders} اليوم` },
                { label: "طلبات فاشلة", value: stats.failedOrders, icon: "⚠️", color: "#ef4444", sub: `${((stats.failedOrders / Math.max(stats.totalOrders, 1)) * 100).toFixed(1)}%` },
                { label: "تذاكر مفتوحة", value: stats.openTickets, icon: "🎫", color: "#f59e0b", sub: `${tickets.length} إجمالي` },
              ].map((s, i) => (
                <div key={i} className="card-dark p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(to right, ${s.color}, transparent)` }} />
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${s.color}15`, color: s.color }}>{s.sub}</span>
                  </div>
                  <div className="text-3xl font-display font-800 text-white mb-1">{s.value.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 card-dark p-6">
                <h3 className="font-display font-800 text-white text-lg mb-4">💰 الإيرادات</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "إجمالي الإيرادات", value: `$${stats.totalRevenue.toFixed(2)}`, color: A, bg: `${A}08`, bc: `${A}15` },
                    { label: "إيرادات اليوم", value: `$${stats.todayRevenue.toFixed(2)}`, color: "#10b981", bg: "#10b98108", bc: "#10b98115" },
                    { label: "الربح التقديري", value: `$${(stats.totalRevenue * 0.3).toFixed(2)}`, color: "#8b5cf6", bg: "#8b5cf608", bc: "#8b5cf615" },
                  ].map((r, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: r.bg, border: `1px solid ${r.bc}` }}>
                      <div className="text-sm text-gray-400 mb-1">{r.label}</div>
                      <div className="text-2xl font-display font-800" style={{ color: r.color }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-dark p-6">
                <h3 className="font-display font-800 text-white text-lg mb-4">🔌 أرصدة المزوّدين</h3>
                <div className="space-y-3">
                  {providers.length === 0 ? <div className="text-gray-600 text-sm">لا يوجد مزوّدين</div> :
                    providers.map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.is_active ? "bg-green-400" : "bg-red-400"}`} />
                          <span className="text-gray-300 text-sm">{p.name}</span>
                        </div>
                        <span className="font-display font-bold text-yellow-400 text-sm">${(p.balance || 0).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="card-dark p-6">
              <h3 className="font-display font-800 text-white text-lg mb-4">🕐 آخر الطلبات</h3>
              <div className="space-y-2">
                {orders.slice(0, 8).map(o => {
                  const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                  return (
                    <div key={o.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: `${st.color}15`, color: st.color }}>{st.label.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 truncate">{(o as any).service?.name || "—"}</div>
                        <div className="text-xs text-gray-600">الكمية: {o.quantity}</div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold" style={{ color: A }}>${o.price.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-600">{timeAgo(o.created_at!)}</div>
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && <div className="text-center py-6 text-gray-600">لا توجد طلبات</div>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ REPORTS ═══ */}
        {!loading && tab === "reports" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "طلبات اليوم", value: stats.todayOrders, icon: "📦", color: "#3b82f6" },
                { label: "إيرادات اليوم", value: `$${stats.todayRevenue.toFixed(2)}`, icon: "💵", color: "#10b981" },
                { label: "عملاء اليوم", value: stats.todayUsers, icon: "👥", color: "#8b5cf6" },
                { label: "متوسط قيمة الطلب", value: `$${stats.avgOrderValue.toFixed(2)}`, icon: "📊", color: "#f59e0b" },
              ].map((s, i) => (
                <div key={i} className="card-dark p-5">
                  <div className="flex items-center gap-2 mb-3"><span className="text-xl">{s.icon}</span><span className="text-sm text-gray-500">{s.label}</span></div>
                  <div className="text-2xl font-display font-800 text-white">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card-dark p-6">
                <h3 className="font-display font-800 text-white mb-4">🏆 أفضل 5 خدمات اليوم</h3>
                <div className="space-y-3">
                  {stats.topServices.length === 0 ? <div className="text-gray-600 text-sm text-center py-4">لا توجد طلبات اليوم</div> :
                    stats.topServices.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${rankColors[i]}25`, color: rankColors[i] }}>#{i + 1}</div>
                        <div className="flex-1 min-w-0 text-sm text-gray-300 truncate">{s.name}</div>
                        <div className="text-sm font-bold" style={{ color: A }}>{s.count}</div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="card-dark p-6">
                <h3 className="font-display font-800 text-white mb-4">⚡ الأكثر نشاطاً</h3>
                <div className="space-y-3">
                  {stats.activeUsers.map((u, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${rankColors[i]}25`, color: rankColors[i] }}>{i + 1}</div>
                      <span className="text-sm text-gray-300 flex-1 truncate">{u.name}</span>
                      <span className="text-sm font-bold text-blue-400">{u.count} طلب</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-dark p-6">
                <h3 className="font-display font-800 text-white mb-4">💎 أكثر إنفاقاً</h3>
                <div className="space-y-3">
                  {stats.topSpenders.map((u, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${rankColors[i]}25`, color: rankColors[i] }}>{i + 1}</div>
                      <span className="text-sm text-gray-300 flex-1 truncate">{u.username}</span>
                      <span className="text-sm font-bold text-green-400">${u.total_spent.toFixed(2)}</span>
                    </div>
                  ))}
                  {stats.topSpenders.length === 0 && <div className="text-gray-600 text-sm text-center py-4">لا يوجد بيانات</div>}
                </div>
              </div>
            </div>

            <div className="card-dark p-6">
              <h3 className="font-display font-800 text-white text-lg mb-6">📈 التقارير الشهرية (آخر 6 أشهر)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <BarChart data={stats.months} dataKey="orders" color="#3b82f6" label="عدد الطلبات" />
                <BarChart data={stats.months} dataKey="revenue" color="#10b981" label="إجمالي الإيرادات" />
                <BarChart data={stats.months} dataKey="profit" color="#8b5cf6" label="الربح التقديري" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ NOTIFICATIONS ═══ */}
        {!loading && tab === "notifications" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-300">🔔 الإشعارات ({notifications.length})</h2>
              <div className="flex gap-2">
                {stats.unreadNotifs > 0 && <button onClick={markAllRead} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400">✓ قراءة الكل</button>}
                {notifications.length > 0 && <button onClick={clearNotifs} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400">🗑️ مسح</button>}
              </div>
            </div>
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} onClick={() => !n.is_read && markNotifRead(n.id)}
                  className={`card-dark p-4 flex items-start gap-3 cursor-pointer transition ${!n.is_read ? "" : "opacity-60"}`}
                  style={!n.is_read ? { borderRight: `3px solid ${NC[n.type] || A}` } : {}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${NC[n.type] || A}15` }}>{NI[n.type] || "📌"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white">{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                    <div className="text-xs text-gray-400">{n.message}</div>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
              ))}
              {notifications.length === 0 && <div className="card-dark p-16 text-center"><div className="text-4xl mb-3">🔕</div><div className="text-gray-500">لا توجد إشعارات</div></div>}
            </div>
          </div>
        )}

        {/* ═══ PROVIDERS ═══ */}
        {!loading && tab === "providers" && (<>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-300">المزوّدين ({providers.length})</h2>
            <button onClick={() => { setEditingProv(null); setProvForm({ name: "", api_url: "", api_key: "", is_active: true, sort_order: 0 }); setShowProvForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ مزوّد</button>
          </div>
          <div className="space-y-3">
            {providers.map(p => (
              <div key={p.id} className="card-dark p-5">
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-white font-display font-800">{p.name}</span><span className={`mr-2 text-xs px-2 py-0.5 rounded ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{p.is_active ? "مفعّل" : "معطّل"}</span></div>
                  <div className="font-display font-bold text-yellow-400">${(p.balance || 0).toFixed(2)}</div>
                </div>
                <div className="text-gray-500 text-xs mb-3" dir="ltr">{p.api_url}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openSyncModal(p)} disabled={syncing} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">🔄 مزامنة</button>
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
              {categories.length > 0 && (<><button onClick={deleteAllCategoriesAndServices} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-600/20 text-red-400 border border-red-600/30">🗑️ حذف الكل</button><button onClick={deleteAllCategories} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400">حذف الفئات</button></>)}
              <button onClick={() => { setEditingCat(null); setCatForm({ name: "", sort_order: 0, is_active: true }); setShowCatForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ فئة</button>
            </div>
          </div>
          <div className="space-y-2">{categories.map(c => (
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
              {services.length > 0 && <button onClick={translateAllExisting} disabled={syncing} className="px-3 py-2 rounded-xl text-xs font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">🌐 ترجمة الكل للعربي</button>}
              {services.length > 0 && <button onClick={deleteAllServices} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400">🗑️ حذف الكل</button>}
              <button onClick={() => { setEditingSvc(null); setSvcForm({ category_id: "", provider_id: "", name: "", platform: "", api_service_id: 0, price_per_1000: 0, min_quantity: 10, max_quantity: 100000, speed: "Default", guarantee_days: 0, description: "", can_refill: false, can_cancel: false, is_active: true, sort_order: 0 }); setShowSvcForm(true); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ خدمة</button>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-white/5 text-gray-500">
              <th className="py-2 px-2 text-right">ID</th>
              <th className="py-2 px-2 text-right">الخدمة</th>
              <th className="py-2 px-2 text-right">المزوّد</th>
              <th className="py-2 px-2 text-right">أقل</th>
              <th className="py-2 px-2 text-right">أعلى</th>
              <th className="py-2 px-2 text-right">سعر البيع</th>
              <th className="py-2 px-2 text-right">الحالة</th>
              <th className="py-2 px-2 text-right">-</th>
            </tr></thead>
            <tbody>{services.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-gray-500 font-mono">{s.api_service_id}</td>
                <td className="py-2.5 px-2 max-w-[320px]">
                  <div className="text-gray-200 truncate font-bold text-[11px]">{s.name}</div>
                  {(s as any).name_en && (s as any).name_en !== s.name && <div className="text-[10px] text-gray-600 truncate mt-0.5" dir="ltr">{(s as any).name_en}</div>}
                </td>
                <td className="py-2 px-2 text-purple-400 text-[10px]">{(s as any).provider?.name || "-"}</td>
                <td className="py-2 px-2 text-gray-400">{s.min_quantity.toLocaleString()}</td>
                <td className="py-2 px-2 text-gray-400">{s.max_quantity.toLocaleString()}</td>
                <td className="py-2 px-2">
                  <div className="font-bold text-green-400">${s.price_per_1000}</div>
                </td>
                <td className="py-2 px-2">{s.is_active
                  ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">مفعّل</span>
                  : <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">معطّل</span>}
                </td>
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
              <th className="py-2 px-2 text-right">ID</th>
              <th className="py-2 px-2 text-right">المستخدم</th>
              <th className="py-2 px-2 text-right">الخدمة</th>
              <th className="py-2 px-2 text-right">المزوّد</th>
              <th className="py-2 px-2 text-right">الرابط</th>
              <th className="py-2 px-2 text-right">البدء</th>
              <th className="py-2 px-2 text-right">الكمية</th>
              <th className="py-2 px-2 text-right">المتبقي</th>
              <th className="py-2 px-2 text-right">السعر</th>
              <th className="py-2 px-2 text-right">الحالة</th>
              <th className="py-2 px-2 text-right">التاريخ</th>
            </tr></thead>
            <tbody>{orders.map(o => { const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending; const usr = (o as any).profile; const svc = (o as any).service; const prov = svc?.provider; return (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2">
                  <div className="text-white font-bold font-mono">#{(o as any).order_number || o.id?.slice(0, 6)}</div>
                  {o.api_order_id && <div className="text-gray-600 font-mono text-[9px]">Ext: {o.api_order_id}</div>}
                </td>
                <td className="py-2 px-2">
                  <span className="text-blue-400 font-bold">{usr?.username || o.user_id.slice(0, 8)}</span>
                </td>
                <td className="py-2 px-2 max-w-[200px]">
                  <div className="text-gray-300 truncate text-[10px]">{svc?.name || "-"}</div>
                </td>
                <td className="py-2 px-2 text-purple-400 text-[10px]">{prov?.name || "-"}</td>
                <td className="py-2 px-2 max-w-[150px]">
                  {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-blue-400/70 hover:text-blue-300 text-[10px] truncate block" dir="ltr" title={o.link}>{o.link.replace(/https?:\/\/(www\.)?/, "").slice(0, 30)}...</a>}
                </td>
                <td className="py-2 px-2 text-gray-400 font-mono">{o.start_count > 0 ? o.start_count.toLocaleString() : "-"}</td>
                <td className="py-2 px-2 text-white font-bold">{o.quantity.toLocaleString()}</td>
                <td className="py-2 px-2 text-gray-400 font-mono">{o.remains > 0 ? o.remains.toLocaleString() : "-"}</td>
                <td className="py-2 px-2 font-bold" style={{ color: A }}>${o.price.toFixed(2)}</td>
                <td className="py-2 px-2"><select value={o.status} onChange={e => updateOrderStatus(o.id!, e.target.value)} className="rounded px-1 py-0.5 bg-dark-700 border-0 text-xs" style={{ color: st.color }}>{Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></td>
                <td className="py-2 px-2 text-gray-500 text-[10px] whitespace-nowrap">{formatDate(o.created_at!)}</td>
              </tr>); })}</tbody>
          </table></div>
        )}

        {/* ═══ USERS ═══ */}
        {!loading && tab === "users" && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-white/5 text-gray-500"><th className="py-2 px-2 text-right">المستخدم</th><th className="py-2 px-2 text-right">الاسم</th><th className="py-2 px-2 text-right">الرصيد</th><th className="py-2 px-2 text-right">الإنفاق</th><th className="py-2 px-2 text-right">المستوى</th><th className="py-2 px-2 text-right">التاريخ</th><th className="py-2 px-2 text-right">-</th></tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white font-bold">{u.username}</td>
                <td className="py-2 px-2 text-gray-400">{u.full_name || "-"}</td>
                <td className="py-2 px-2 font-bold" style={{ color: P }}>${u.balance.toFixed(2)}</td>
                <td className="py-2 px-2 text-gray-400">${u.total_spent.toFixed(2)}</td>
                <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${A}15`, color: A }}>Lv.{u.level}</span></td>
                <td className="py-2 px-2 text-gray-500 text-xs">{u.created_at ? formatDate(u.created_at) : "-"}</td>
                <td className="py-2 px-2"><button onClick={() => updateBalance(u.id)} className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">تعديل</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}

        {/* ═══ TICKETS ═══ */}
        {!loading && tab === "tickets" && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-bold text-gray-300 mb-4">🎫 تذاكر الدعم ({tickets.length})</h2>
            <div className="space-y-3">
              {tickets.map(t => {
                const ts2 = TS[t.status] || TS.open;
                const tp2 = TP[t.priority] || TP.normal;
                const usr = users.find(u => u.id === t.user_id);
                return (
                  <div key={t.id} className="card-dark p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-white font-bold">{t.subject}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${ts2.c}15`, color: ts2.c }}>{ts2.l}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${tp2.c}15`, color: tp2.c }}>{tp2.l}</span>
                        </div>
                        <div className="text-xs text-gray-500">من: {usr?.username || t.user_id.slice(0, 8)} • {formatDate(t.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-3 p-3 rounded-lg bg-dark-800">{t.message}</div>
                    {t.admin_reply && (
                      <div className="text-sm p-3 rounded-lg mb-3" style={{ background: `${A}08`, border: `1px solid ${A}15` }}>
                        <span className="text-xs font-bold" style={{ color: A }}>رد الإدارة:</span>
                        <div className="text-gray-300 mt-1">{t.admin_reply}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setShowTicketReply(t); setTicketReply(t.admin_reply || ""); }} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: A }}>💬 رد</button>
                      <select value={t.status} onChange={e => updateTicketStatus(t.id, e.target.value)} className="rounded-lg px-2 py-1 bg-dark-700 border border-white/5 text-xs text-gray-300">
                        {Object.entries(TS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {tickets.length === 0 && <div className="card-dark p-16 text-center"><div className="text-4xl mb-3">🎫</div><div className="text-gray-500">لا توجد تذاكر دعم</div><div className="text-gray-600 text-sm mt-1">سيتم عرضها عند إرسالها من المستخدمين</div></div>}
            </div>
          </div>
        )}

        {/* ═══ DEPOSITS ═══ */}
        {!loading && tab === "deposits" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-300">💳 طلبات الشحن ({adminDeposits.length})</h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold">{adminDeposits.filter(d => d.status === "pending").length} بانتظار</span>
                <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 font-bold">{adminDeposits.filter(d => d.status === "approved").length} مقبول</span>
                <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold">{adminDeposits.filter(d => d.status === "rejected").length} مرفوض</span>
              </div>
            </div>

            <div className="space-y-3">
              {adminDeposits.map(d => {
                const ds = DEPOSIT_STATUSES[d.status] || DEPOSIT_STATUSES.pending;
                const method = PAYMENT_METHODS[d.method as keyof typeof PAYMENT_METHODS];
                const usr = (d as any).profile;
                return (
                  <div key={d.id} className="card-dark p-5" style={d.status === "pending" ? { borderRight: `3px solid #f59e0b` } : {}}>
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${ds.color}10` }}>
                        {method?.icon || "💳"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-2xl font-display font-800 text-white">${d.amount.toFixed(2)}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: `${ds.color}15`, color: ds.color }}>{ds.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-white/5 text-gray-400">{method?.name || d.method}</span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                          <span>👤 <strong className="text-blue-400">{usr?.username || d.user_id.slice(0, 8)}</strong></span>
                          <span>🕐 {d.created_at ? new Date(d.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </div>

                        {/* Transaction ID */}
                        {d.transaction_id && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-gray-600">TX:</span>
                            <span className="text-xs font-mono text-gray-400 bg-dark-800 px-2 py-0.5 rounded" dir="ltr">{d.transaction_id}</span>
                            <button onClick={() => { navigator.clipboard.writeText(d.transaction_id); toast.success("تم النسخ"); }}
                              className="text-[10px] text-gray-600 hover:text-white">📋</button>
                          </div>
                        )}

                        {/* Admin note */}
                        {d.admin_note && (
                          <div className="text-xs mt-1 px-2 py-1 rounded bg-yellow-500/5 text-yellow-400/70">💬 {d.admin_note}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {d.status === "pending" && (<>
                          <button onClick={() => approveDeposit(d)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:brightness-110"
                            style={{ background: "#10b981" }}>
                            ✓ قبول
                          </button>
                          <button onClick={() => rejectDeposit(d)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition">
                            ✗ رفض
                          </button>
                        </>)}
                        {d.status === "approved" && (
                          <span className="text-xs text-green-400 font-bold text-center">✓ تمت الإضافة</span>
                        )}
                        {d.status === "rejected" && (
                          <span className="text-xs text-red-400 font-bold text-center">✗ مرفوض</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {adminDeposits.length === 0 && (
                <div className="card-dark p-16 text-center">
                  <div className="text-5xl mb-3 opacity-30">💳</div>
                  <div className="text-gray-500">لا توجد طلبات شحن</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════ */}
      {/* ═══ ALL MODALS ═══ */}
      {/* ═══════════════════════════════════ */}

      {/* SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => !syncing && setShowSyncModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: "#12121a", border: `1px solid ${A}30` }}>
            <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div><h2 className="font-display text-lg font-800 text-white">🔄 مزامنة من {syncProvider?.name}</h2><p className="text-gray-500 text-sm mt-1">اختر الخدمات للاستيراد</p></div>
              <button onClick={() => !syncing && setShowSyncModal(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 border-b border-white/5 shrink-0">
              <div className="flex gap-3 items-center mb-3">
                <input type="search" value={syncSearch} onChange={e => setSyncSearch(e.target.value)} placeholder="بحث..." className="admin-input flex-1" />
                <span className="text-gray-400 text-sm whitespace-nowrap">{selectedCount}/{totalCount}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => selectAllSync(true)} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400">✅ تحديد الكل</button>
                <button onClick={() => selectAllSync(false)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400">❌ إلغاء الكل</button>
              </div>
            </div>

            {/* Pricing Adjustments */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0" style={{ background: "#0d0d15" }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-400">💰 نسبة الربح:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500">ثابت $</span>
                  <input type="number" step="0.01" min="0" value={priceFixedAdd || ""} onChange={e => setPriceFixedAdd(Number(e.target.value) || 0)}
                    placeholder="0.00" className="w-20 px-2 py-1 rounded-lg text-xs text-center bg-dark-700 border border-white/10 text-white" dir="ltr" />
                </div>
                <span className="text-gray-600 text-sm">+</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500">نسبة %</span>
                  <input type="number" step="1" min="0" value={pricePctAdd || ""} onChange={e => setPricePctAdd(Number(e.target.value) || 0)}
                    placeholder="0" className="w-16 px-2 py-1 rounded-lg text-xs text-center bg-dark-700 border border-white/10 text-white" dir="ltr" />
                </div>
                {(priceFixedAdd > 0 || pricePctAdd > 0) && (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                      مثال: ${`$1.00`} → ${`$${(1 + priceFixedAdd + (1 * pricePctAdd / 100)).toFixed(2)}`}
                    </span>
                    <button onClick={() => { setPriceFixedAdd(0); setPricePctAdd(0); }} className="text-[10px] text-gray-500 hover:text-red-400">↻ صفّر</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {syncLoading ? <div className="text-center py-12 text-gray-500">جاري جلب الخدمات...</div> :
                filteredSyncCats.length === 0 ? <div className="text-center py-12 text-gray-500">لا توجد نتائج</div> :
                  filteredSyncCats.map(cat => {
                    const oi = syncCategories.findIndex(c => c.name === cat.name);
                    return (
                      <div key={cat.name} className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a40" }}>
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03]" onClick={() => toggleCatExpand(oi)}>
                          <input type="checkbox" checked={cat.selected} onChange={e => { e.stopPropagation(); toggleCatSelection(oi); }} className="w-4 h-4 rounded" style={{ accentColor: A }} onClick={e => e.stopPropagation()} />
                          <span className="text-white font-bold flex-1">{cat.name}</span>
                          <span className="text-gray-500 text-xs">{cat.services.filter(s => s.selected).length}/{cat.services.length}</span>
                          <span className="text-gray-500">{cat.expanded ? "▲" : "▼"}</span>
                        </div>
                        {cat.expanded && <div className="border-t border-white/5 bg-dark-900/50">
                          {cat.services.map(svc => {
                            const si = syncCategories[oi].services.findIndex(s => s.service === svc.service);
                            return (
                              <label key={svc.service} className="flex items-center gap-3 px-6 py-2 hover:bg-white/[0.02] cursor-pointer text-sm">
                                <input type="checkbox" checked={svc.selected} onChange={() => toggleSvcSelection(oi, si)} className="w-3.5 h-3.5 rounded" style={{ accentColor: A }} />
                                <span className="text-gray-400 font-mono text-xs w-12">{svc.service}</span>
                                <span className="text-gray-300 flex-1 truncate">{svc.name}</span>
                                <span className="text-xs font-bold" style={{ color: A }}>${svc.rate}/1K</span>
                                {(priceFixedAdd > 0 || pricePctAdd > 0) && <span className="text-[10px] text-green-400">${(Number(svc.rate) + priceFixedAdd + (Number(svc.rate) * pricePctAdd / 100)).toFixed(3)}</span>}
                                <span className="text-gray-600 text-xs">{svc.min}-{svc.max}</span>
                                {svc.refill && <span className="text-xs text-green-400">♻️</span>}
                                {svc.cancel && <span className="text-xs text-red-400">❌</span>}
                              </label>
                            );
                          })}
                        </div>}
                      </div>
                    );
                  })}
            </div>
            <div className="p-4 border-t border-white/5 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">تم اختيار <strong className="text-white">{selectedCount}</strong> خدمة</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 rounded-full transition-colors peer-checked:bg-green-500 bg-gray-600" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs font-bold" style={{ color: autoTranslate ? "#10b981" : "#666" }}>🌐 ترجمة تلقائية للعربي</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSyncModal(false)} disabled={syncing} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 border border-white/10 hover:bg-white/5 disabled:opacity-50">إلغاء</button>
                <button onClick={importSelected} disabled={syncing || selectedCount === 0} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: selectedCount > 0 ? A : "#555" }}>{syncing ? "جاري الاستيراد..." : `استيراد ${selectedCount} خدمة`}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROVIDER MODAL */}
      {showProvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProvForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingProv ? "تعديل" : "إضافة"} مزوّد</h2>
            <div className="space-y-3">
              <div><label className="text-gray-400 text-sm">الاسم</label><input value={provForm.name || ""} onChange={e => setProvForm({ ...provForm, name: e.target.value })} className="admin-input" /></div>
              <div><label className="text-gray-400 text-sm">API URL</label><input value={provForm.api_url || ""} onChange={e => setProvForm({ ...provForm, api_url: e.target.value })} className="admin-input" dir="ltr" /></div>
              <div><label className="text-gray-400 text-sm">API Key</label><input value={provForm.api_key || ""} onChange={e => setProvForm({ ...provForm, api_key: e.target.value })} className="admin-input" dir="ltr" /></div>
              <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={provForm.is_active} onChange={e => setProvForm({ ...provForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveProv} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-md card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingCat ? "تعديل" : "إضافة"} فئة</h2>
            <div className="space-y-3">
              <input value={catForm.name || ""} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="اسم الفئة" className="admin-input" />
              <input type="number" value={catForm.sort_order || 0} onChange={e => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} className="admin-input" dir="ltr" />
              <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={catForm.is_active} onChange={e => setCatForm({ ...catForm, is_active: e.target.checked })} /> مفعّل</label>
              <button onClick={saveCat} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {showSvcForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSvcForm(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-4" style={{ color: A }}>{editingSvc ? "تعديل" : "إضافة"} خدمة</h2>
            <div className="space-y-3">
              <select value={svcForm.provider_id || ""} onChange={e => setSvcForm({ ...svcForm, provider_id: e.target.value })} className="admin-input"><option value="">المزوّد...</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={svcForm.category_id || ""} onChange={e => setSvcForm({ ...svcForm, category_id: e.target.value })} className="admin-input"><option value="">الفئة...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input value={svcForm.name || ""} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="الاسم" className="admin-input" />
              <input type="number" value={svcForm.api_service_id || 0} onChange={e => setSvcForm({ ...svcForm, api_service_id: Number(e.target.value) })} placeholder="API ID" className="admin-input" dir="ltr" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.001" value={svcForm.price_per_1000 || ""} onChange={e => setSvcForm({ ...svcForm, price_per_1000: Number(e.target.value) })} placeholder="$/1K" className="admin-input" dir="ltr" />
                <input type="number" value={svcForm.min_quantity || ""} onChange={e => setSvcForm({ ...svcForm, min_quantity: Number(e.target.value) })} placeholder="أقل" className="admin-input" dir="ltr" />
                <input type="number" value={svcForm.max_quantity || ""} onChange={e => setSvcForm({ ...svcForm, max_quantity: Number(e.target.value) })} placeholder="أعلى" className="admin-input" dir="ltr" />
                <input value={svcForm.speed || ""} onChange={e => setSvcForm({ ...svcForm, speed: e.target.value })} placeholder="السرعة" className="admin-input" />
              </div>
              <textarea value={svcForm.description || ""} onChange={e => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="الوصف" className="admin-input !h-16" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.is_active} onChange={e => setSvcForm({ ...svcForm, is_active: e.target.checked })} /> مفعّل</label>
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.can_refill || false} onChange={e => setSvcForm({ ...svcForm, can_refill: e.target.checked })} /> ♻️</label>
                <label className="flex items-center gap-2 text-gray-300 text-sm"><input type="checkbox" checked={svcForm.can_cancel || false} onChange={e => setSvcForm({ ...svcForm, can_cancel: e.target.checked })} /> ❌</label>
              </div>
              <button onClick={saveSvc} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: A }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET REPLY MODAL */}
      {showTicketReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowTicketReply(null)} />
          <div className="relative w-full max-w-lg card-dark p-6">
            <h2 className="font-display text-lg font-800 mb-2" style={{ color: A }}>💬 الرد على التذكرة</h2>
            <p className="text-gray-400 text-sm mb-4">{showTicketReply.subject}</p>
            <div className="p-3 rounded-lg bg-dark-800 text-sm text-gray-400 mb-4">{showTicketReply.message}</div>
            <textarea value={ticketReply} onChange={e => setTicketReply(e.target.value)} placeholder="اكتب ردك هنا..." className="admin-input !h-28 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowTicketReply(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 border border-white/10 hover:bg-white/5">إلغاء</button>
              <button onClick={replyTicket} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: A }}>إرسال الرد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
