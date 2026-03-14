"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, STORE, ORDER_STATUSES, DEPOSIT_STATUSES, PAYMENT_METHODS, TICKET_STATUSES, type Profile, type Order, type Category, type Service, type Deposit, type SupportTicket, type ReferralCommission } from "@/lib/supabase";
import { placeProviderOrder, cancelOrders, refillOrder, getOrderStatus } from "@/lib/smm-api";
import toast from "react-hot-toast";

const A = STORE.accentColor;
const C = STORE.color;

// ── Fixed platform filters ──
const PLATFORM_FILTERS = [
  { key: "all", label: "••• الكل", keywords: [] },
  { key: "facebook", label: "فيسبوك", keywords: ["facebook", "فيسبوك", "fb "] },
  { key: "instagram", label: "انستجرام", keywords: ["instagram", "انستقرام", "انستجرام", "insta"] },
  { key: "tiktok", label: "تيك توك", keywords: ["tiktok", "تيك توك", "tik tok"] },
  { key: "youtube", label: "يوتيوب", keywords: ["youtube", "يوتيوب", "yt "] },
  { key: "twitter", label: "تويتر", keywords: ["twitter", "تويتر", "x.com"] },
  { key: "telegram", label: "تيليجرام", keywords: ["telegram", "تيليجرام", "تليجرام"] },
  { key: "snapchat", label: "سناب شات", keywords: ["snapchat", "سناب شات", "snap"] },
  { key: "spotify", label: "سبوتيفاي", keywords: ["spotify", "سبوتيفاي"] },
  { key: "threads", label: "ثريدز", keywords: ["threads", "ثريدز"] },
  { key: "other", label: "آخر", keywords: [] },
];

// ── Platform SVG Icons ──
const PlatformSvg: Record<string, JSX.Element> = {
  all: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 7C5 6.45 5.45 6 6 6H18C18.55 6 19 6.45 19 7S18.55 8 18 8H6C5.45 8 5 7.55 5 7ZM5 12C5 11.45 5.45 11 6 11H18C18.55 11 19 11.45 19 12S18.55 13 18 13H6C5.45 13 5 12.55 5 12ZM19 17C19 17.55 18.55 18 18 18H6C5.45 18 5 17.55 5 17S5.45 16 6 16H18C18.55 16 19 16.45 19 17Z"/></svg>,
  facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 12.05C20 7.6 16.42 4 12 4S4 7.6 4 12.05C4 16.07 6.93 19.4 10.75 20V14.38H8.72V12.05H10.75V10.28C10.75 8.26 11.94 7.14 13.77 7.14C14.65 7.14 15.56 7.3 15.56 7.3V9.28H14.55C13.56 9.28 13.25 9.9 13.25 10.54V12.05H15.47L15.11 14.38H13.25V20C17.07 19.4 20 16.07 20 12.05Z"/></svg>,
  instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C14.17 4 14.44 4.01 15.29 4.05C15.96 4.06 16.61 4.19 17.23 4.42C18.31 4.84 19.16 5.68 19.57 6.76C19.81 7.38 19.94 8.05 19.95 8.72C20 9.57 20 9.85 20 12.01C20 14.18 19.99 14.45 19.95 15.3C19.93 15.97 19.81 16.62 19.58 17.24C19.16 18.31 18.31 19.16 17.24 19.58C16.61 19.81 15.96 19.94 15.29 19.95C14.44 20 14.17 20 12 20S9.56 19.99 8.7 19.95C8.03 19.93 7.38 19.79 6.76 19.55C5.68 19.14 4.84 18.29 4.42 17.22C4.19 16.6 4.06 15.94 4.05 15.28C4 14.43 4 14.15 4 11.99C4 9.82 4.01 9.55 4.05 8.7C4.06 8.03 4.19 7.38 4.42 6.76C4.83 5.68 5.68 4.84 6.76 4.42C7.38 4.19 8.04 4.06 8.7 4.05C9.55 4 9.83 4 12 4ZM12 7.88C9.72 7.88 7.88 9.72 7.88 11.98C7.88 14.25 9.72 16.08 12 16.08C14.26 16.08 16.1 14.25 16.1 11.98C16.1 9.72 14.26 7.88 12 7.88ZM12 14.65C10.52 14.65 9.32 13.45 9.32 11.98C9.32 10.51 10.52 9.32 12 9.32S14.66 10.51 14.66 11.98C14.66 13.45 13.46 14.65 12 14.65ZM16.26 6.77C15.73 6.77 15.3 7.2 15.3 7.73C15.3 8.26 15.73 8.69 16.26 8.69C16.79 8.69 17.22 8.26 17.22 7.73C17.22 7.2 16.79 6.77 16.26 6.77Z"/></svg>,
  tiktok: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69A4.83 4.83 0 0115.82 2.44V2H12.37V15.67A2.89 2.89 0 019.49 18.17A2.89 2.89 0 016.6 15.28A2.89 2.89 0 019.49 12.39C9.77 12.39 10.03 12.43 10.28 12.49V8.99A6.37 6.37 0 009.49 8.94A6.34 6.34 0 003.15 15.2A6.34 6.34 0 0014.01 19.63V12.48A8.16 8.16 0 0019.59 14.68V11.2A4.85 4.85 0 0115.82 9.46V6.69H19.59Z"/></svg>,
  youtube: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.16A3.02 3.02 0 0019.46 5.04C17.89 4.6 12 4.6 12 4.6S6.11 4.6 4.55 5.04A3.02 3.02 0 002.44 7.16C2 8.76 2 12 2 12S2 15.24 2.44 16.84A3.02 3.02 0 004.55 18.96C6.11 19.4 12 19.4 12 19.4S17.89 19.4 19.46 18.96A3.02 3.02 0 0021.58 16.84C22 15.24 22 12 22 12S22 8.76 21.58 7.16ZM10 15V9L15.82 12L10 15Z"/></svg>,
  twitter: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25H21.55L14.33 10.51L22.5 21.75H16.17L10.96 14.93L4.99 21.75H1.68L9.41 12.92L1.25 2.25H7.8L12.5 8.48ZM17.08 19.77H18.92L7.08 4.13H5.12Z"/></svg>,
  telegram: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.94 0A12 12 0 000 12A12 12 0 0012 24A12 12 0 0024 12A12 12 0 0012 0ZM16.96 7.22C17.06 7.22 17.28 7.24 17.42 7.36A.51.51 0 0117.6 7.69C17.61 7.78 17.63 8 17.61 8.16C17.43 10.06 16.65 14.66 16.25 16.79C16.08 17.69 15.75 17.98 15.43 18.01C14.73 18.08 14.19 17.52 13.46 17.05C12.16 16.15 11.41 15.6 10.16 14.72C8.7 13.71 9.64 13.15 10.48 12.25C10.7 12.01 13.46 9.38 13.53 9.05C13.54 9.01 13.55 8.86 13.46 8.77C13.37 8.69 13.25 8.72 13.16 8.74C13.03 8.77 11.24 9.92 7.94 12.08C7.36 12.5 6.83 12.71 6.35 12.7C5.82 12.69 5.3 12.55 4.86 12.4C4.33 12.22 3.92 12.13 3.96 11.61C3.98 11.33 4.37 11.06 5.1 10.75L13.7 7.12C13.7 7.12 16.67 5.87 16.96 7.22Z"/></svg>,
  snapchat: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.14 4C12.8 4 15.04 4.2 16.09 6.73C16.44 7.58 16.36 9.03 16.29 10.19L16.27 10.59C16.32 10.63 16.4 10.66 16.54 10.66C16.74 10.65 16.97 10.57 17.22 10.44C17.32 10.39 17.43 10.37 17.53 10.37C17.65 10.37 17.77 10.39 17.87 10.43C18.17 10.54 18.36 10.78 18.36 11.03C18.37 11.35 18.1 11.63 17.55 11.87C17.49 11.89 17.41 11.92 17.32 11.95C17.02 12.05 16.56 12.21 16.44 12.53C16.38 12.69 16.39 12.9 16.52 13.15L16.53 13.16C16.57 13.26 17.54 15.64 19.72 16.02C19.89 16.06 20.01 16.22 20 16.39C20 16.44 19.99 16.5 19.97 16.55C19.81 16.95 19.12 17.25 17.87 17.46C17.83 17.52 17.79 17.72 17.76 17.86C17.74 17.99 17.71 18.12 17.67 18.26C17.62 18.45 17.49 18.55 17.3 18.55H17.28C17.16 18.54 17.04 18.52 16.92 18.49C16.65 18.43 16.36 18.4 16.08 18.4C15.88 18.4 15.68 18.41 15.47 18.45C15.07 18.52 14.72 18.78 14.32 19.08C13.75 19.51 13.1 20 12.12 20H11.9C10.92 20 10.29 19.51 9.72 19.07C9.32 18.77 8.98 18.51 8.58 18.44C8.37 18.41 8.17 18.39 7.96 18.39C7.6 18.39 7.32 18.45 7.11 18.49C6.99 18.52 6.87 18.54 6.75 18.55C6.5 18.55 6.4 18.39 6.36 18.25C6.32 18.11 6.3 17.97 6.27 17.84C6.24 17.71 6.2 17.49 6.16 17.43C4.88 17.28 4.2 16.98 4.04 16.56C4.02 16.51 4 16.45 4 16.4C4 16.31 4.02 16.23 4.08 16.16C4.13 16.09 4.2 16.05 4.28 16.04C6.46 15.65 7.43 13.27 7.47 13.17L7.49 13.14C7.61 12.9 7.63 12.68 7.56 12.52C7.43 12.21 6.98 12.06 6.68 11.95C6.6 11.93 6.52 11.9 6.45 11.86C5.71 11.55 5.61 11.2 5.65 10.95C5.71 10.61 6.1 10.39 6.43 10.39C6.52 10.39 6.61 10.41 6.68 10.44C6.96 10.58 7.21 10.65 7.42 10.65C7.57 10.65 7.67 10.61 7.73 10.58L7.7 10.17C7.63 9.01 7.55 7.57 7.9 6.72C8.93 4.2 11.16 4.01 11.82 4.01L12.14 4Z"/></svg>,
  spotify: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12S5.4 24 12 24 24 18.6 24 12 18.66 0 12 0ZM17.52 17.34C17.28 17.7 16.86 17.82 16.5 17.58 13.68 15.84 10.14 15.48 5.94 16.44 5.52 16.56 5.16 16.26 5.04 15.9 4.92 15.48 5.22 15.12 5.58 15 10.14 13.98 14.1 14.4 17.28 16.38 17.64 16.56 17.76 17.01 17.52 17.34ZM18.96 14.04C18.66 14.46 18.12 14.64 17.7 14.34 14.46 12.36 9.54 11.76 5.76 12.96 5.28 13.08 4.74 12.84 4.62 12.36 4.5 11.88 4.74 11.34 5.22 11.22 9.54 9.9 14.94 10.56 18.66 12.84 18.96 13.02 19.14 13.62 18.96 14.04ZM19.08 10.69C15.24 8.4 8.82 8.16 5.16 9.3 4.56 9.48 3.96 9.12 3.78 8.58 3.6 7.98 3.96 7.38 4.5 7.2 8.76 5.94 15.78 6.18 20.22 8.82 20.76 9.12 20.94 9.84 20.64 10.38 20.34 10.8 19.62 10.98 19.08 10.69Z"/></svg>,
  threads: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.59 8.15C16.47 8.09 16.35 8.04 16.23 7.99C16.04 6.5 15.09 5.56 13.42 5.55C12.27 5.54 11.35 6.08 10.82 7.03L11.87 7.63C12.25 6.96 12.81 6.77 13.41 6.77C14.21 6.77 14.79 7.14 14.82 7.86C14.11 7.78 13.35 7.82 12.59 7.98C11.13 8.27 10.15 9.17 10.25 10.43C10.35 11.72 11.49 12.53 12.92 12.44C13.95 12.38 14.75 11.88 15.22 11.05C15.56 11.49 15.76 12.05 15.72 12.84C15.62 14.52 14.21 15.6 12.07 15.62C9.66 15.59 8.08 14.22 8.05 11.99C8.08 9.79 9.66 8.42 12.07 8.38C12.99 8.4 13.73 8.6 14.31 8.97L14.93 7.85C14.17 7.38 13.22 7.12 12.08 7.1C8.84 7.15 6.76 9.18 6.72 12C6.76 14.84 8.84 16.87 12.08 16.9C14.93 16.87 16.87 15.29 17 12.9C17.08 11.71 16.72 10.76 16.05 10.1C16.32 9.49 16.5 8.82 16.59 8.15ZM12.79 11.24C11.89 11.3 11.48 10.83 11.45 10.46C11.4 9.86 11.97 9.41 12.78 9.25C13.05 9.19 13.68 9.13 14.42 9.19C14.52 9.19 14.62 9.2 14.72 9.22C14.58 10.51 13.88 11.17 12.79 11.24Z"/></svg>,
  other: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 5C13 4.45 12.55 4 12 4S11 4.45 11 5V11H5C4.45 11 4 11.45 4 12S4.45 13 5 13H11V19C11 19.55 11.45 20 12 20S13 19.55 13 19V13H19C19.55 13 20 12.55 20 12S19.55 11 19 11H13V5Z"/></svg>,
};

// Helper: check if a category name matches a platform
function catMatchesPlatform(catName: string, platform: typeof PLATFORM_FILTERS[0]): boolean {
  if (platform.key === "all") return true;
  if (platform.key === "other") {
    // "Other" = doesn't match ANY known platform
    return !PLATFORM_FILTERS.some(p => p.key !== "all" && p.key !== "other" && p.keywords.some(kw => catName.toLowerCase().includes(kw)));
  }
  return platform.keywords.some(kw => catName.toLowerCase().includes(kw));
}

export default function DashboardPage() {
  const router = useRouter();

  const VALID_VIEWS = ["new_order", "orders", "services", "add_funds", "deposits", "tickets", "affiliate", "settings"] as const;
  type ViewType = typeof VALID_VIEWS[number];

  // Read initial tab from URL
  const getInitialTab = (): ViewType => {
    if (typeof window === "undefined") return "new_order";
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "new_order";
    return VALID_VIEWS.includes(tab as any) ? tab as ViewType : "new_order";
  };

  const [activeView, setActiveViewState] = useState<ViewType>("new_order");
  const [mounted, setMounted] = useState(false);

  // Set initial tab from URL on mount
  useEffect(() => { setActiveViewState(getInitialTab()); setMounted(true); }, []);

  // Update URL when view changes
  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewState(view);
    const url = view === "new_order" ? "/dashboard" : `/dashboard?tab=${view}`;
    window.history.pushState({}, "", url);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePop = () => setActiveViewState(getInitialTab());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── New Order State ──
  const [activePlatform, setActivePlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderLink, setOrderLink] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  // ── Deposit State ──
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositMethod, setDepositMethod] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // ── Support Tickets State ──
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);

  // ── Affiliate State ──
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);

  // ── API Key State ──
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  // Handle Binance Pay return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get("deposit");
    if (depositStatus === "success") {
      toast.success("تم الدفع بنجاح! سيتم إضافة رصيدك خلال لحظات ✓");
      setActiveView("deposits");
    } else if (depositStatus === "cancelled") {
      toast("تم إلغاء عملية الدفع", { icon: "⚠️" });
      setActiveView("deposits");
    }
  }, [setActiveView]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth"); return; }
    setUser(session.user);

    // Handle Google OAuth referral linkage
    if (typeof window !== "undefined") {
      const storedRef = localStorage.getItem("growence_ref");
      if (storedRef) {
        localStorage.removeItem("growence_ref");
        try {
          const { data: referrer } = await supabase.from("profiles").select("id").eq("referral_code", storedRef.toUpperCase()).single();
          if (referrer && referrer.id !== session.user.id) {
            const { data: myProfile } = await supabase.from("profiles").select("referred_by").eq("id", session.user.id).single();
            if (myProfile && !myProfile.referred_by) {
              await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", session.user.id);
            }
          }
        } catch { /* ignore */ }
      }
    }

    await Promise.all([fetchProfile(session.user.id), fetchOrders(session.user.id), fetchDeposits(session.user.id), fetchTickets(session.user.id), fetchCategories(), fetchServices()]);
    setLoading(false);
  }

  async function fetchProfile(uid: string) { const { data } = await supabase.from("profiles").select("*").eq("id", uid).single(); if (data) setProfile(data); }
  async function fetchOrders(uid: string) { const { data } = await supabase.from("orders").select("*, service:services(*, provider:providers(id))").eq("user_id", uid).order("created_at", { ascending: false }).limit(50); if (data) setOrders(data); }
  async function fetchDeposits(uid: string) { const { data } = await supabase.from("deposits").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50).then(r => r, () => ({ data: null })); if (data) setDeposits(data as any); }
  async function fetchTickets(uid: string) { const { data } = await supabase.from("support_tickets").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50).then(r => r, () => ({ data: null })); if (data) setTickets(data as any); }
  async function fetchReferrals(uid: string) { const { data } = await supabase.from("profiles").select("id, username, created_at, total_spent").eq("referred_by", uid).order("created_at", { ascending: false }).then(r => r, () => ({ data: null })); if (data) setReferrals(data); }
  async function fetchCommissions(uid: string) { const { data } = await supabase.from("referral_commissions").select("*").eq("referrer_id", uid).order("created_at", { ascending: false }).limit(50).then(r => r, () => ({ data: null })); if (data) setCommissions(data as any); }
  async function fetchCategories() { const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order"); if (data) setCategories(data); }
  async function fetchServices() { const { data } = await supabase.from("services").select("*, category:categories(*), provider:providers(id, name)").eq("is_active", true).order("sort_order"); if (data) setServices(data); }

  // ── Filter Logic ──
  const selectedPlatform = PLATFORM_FILTERS.find(p => p.key === activePlatform) || PLATFORM_FILTERS[0];

  // Categories filtered by platform
  const filteredCategories = useMemo(() => {
    const catIds = new Set(services.map(s => s.category_id));
    let cats = categories.filter(c => catIds.has(c.id!));
    if (activePlatform !== "all") {
      cats = cats.filter(c => catMatchesPlatform(c.name, selectedPlatform));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchingSvcCatIds = new Set(services.filter(s => s.name.toLowerCase().includes(q)).map(s => s.category_id));
      cats = cats.filter(c => c.name.toLowerCase().includes(q) || matchingSvcCatIds.has(c.id!));
    }
    return cats;
  }, [categories, services, activePlatform, selectedPlatform, searchQuery]);

  // Services filtered by selected category
  const filteredServices = useMemo(() => {
    if (!selectedCatId) return [];
    let list = services.filter(s => s.category_id === selectedCatId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [services, selectedCatId, searchQuery]);

  // ── Search dropdown results ──
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return services.filter(s => 
      s.name.toLowerCase().includes(q) || 
      String(s.api_service_id).includes(q) ||
      (s as any).category?.name?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [services, searchQuery]);

  const orderPrice = selectedService && orderQuantity ? (selectedService.price_per_1000 / 1000) * Number(orderQuantity) : 0;

  // ── Filtered orders ──
  const displayedOrders = useMemo(() => {
    let list = orders;
    if (orderFilter !== "all") list = list.filter(o => o.status === orderFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        (o.api_order_id || "").toLowerCase().includes(q) ||
        o.link.toLowerCase().includes(q) ||
        ((o as any).service?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderFilter, orderSearch]);

  async function handlePlaceOrder() {
    if (!selectedService || !orderLink || !orderQuantity) { toast.error("الرجاء تعبئة جميع الحقول"); return; }
    const qty = Number(orderQuantity);
    if (qty < selectedService.min_quantity || qty > selectedService.max_quantity) { toast.error(`الكمية: ${selectedService.min_quantity} - ${selectedService.max_quantity}`); return; }
    if (!profile || profile.balance < orderPrice) { toast.error("رصيدك غير كافٍ!"); return; }
    try {
      const apiResult = await placeProviderOrder(selectedService.provider_id, selectedService.api_service_id, orderLink, qty);
      if (apiResult.error) { toast.error(`خطأ: ${apiResult.error}`); return; }
      await supabase.from("profiles").update({ balance: profile.balance - orderPrice, total_spent: (profile.total_spent || 0) + orderPrice }).eq("id", user.id);
      await supabase.from("orders").insert({ user_id: user.id, service_id: selectedService.id, api_order_id: String(apiResult.order || ""), link: orderLink, quantity: qty, price: orderPrice, status: "pending", start_count: 0, remains: qty });
      toast.success("تم إرسال الطلب بنجاح!"); setOrderLink(""); setOrderQuantity(""); setSelectedService(null);
      await Promise.all([fetchProfile(user.id), fetchOrders(user.id)]);
    } catch (err) { console.error(err); toast.error("حدث خطأ"); }
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/auth"); }

  // ── Deposit Handler — All methods are manual ──
  async function handleManualDeposit() {
    if (!depositMethod) { toast.error("اختر طريقة الدفع"); return; }
    const amt = Number(depositAmount);
    const method = PAYMENT_METHODS[depositMethod as keyof typeof PAYMENT_METHODS];
    if (!method) { toast.error("طريقة دفع غير صالحة"); return; }
    if (!amt || amt < method.minAmount) { toast.error(`الحد الأدنى $${method.minAmount}`); return; }
    if (!depositTxId.trim()) { toast.error("أدخل رقم العملية أو Transaction ID"); return; }
    setDepositSubmitting(true);
    try {
      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: amt,
        method: depositMethod,
        transaction_id: depositTxId.trim(),
        status: "pending",
      });
      if (error) throw error;
      toast.success("تم إرسال طلب الشحن! تواصل معنا لتأكيد الدفع ✓", { duration: 5000 });
      setDepositAmount(""); setDepositTxId(""); setDepositMethod("");
      setActiveView("deposits");
      fetchDeposits(user.id);
    } catch (err: any) { toast.error(err.message || "خطأ"); }
    finally { setDepositSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${C}40`, borderTopColor: "transparent" }} /></div>;

  const menuItems = [
    { key: "new_order", icon: "🛒", label: "طلب جديد" },
    { key: "orders", icon: "📋", label: "الطلبات" },
    { key: "add_funds", icon: "💰", label: "شحن الرصيد" },
    { key: "deposits", icon: "📜", label: "سجل الشحن" },
    { key: "services", icon: "❤️", label: "الخدمات" },
    { key: "tickets", icon: "🎫", label: "الدعم" },
    { key: "affiliate", icon: "🤝", label: "الإحالة" },
    { key: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-dark-900 lg:flex" style={{ "--brand-color": C, "--brand-rgb": STORE.colorRgb } as any}>
      {/* ═══ SIDEBAR OVERLAY (mobile) ═══ */}
      {sidebarOpen && <div className="fixed inset-0 z-[60] bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed lg:sticky top-0 right-0 z-[70] lg:z-auto h-screen w-[260px] bg-dark-800 border-l border-white/5 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        {/* Close button - mobile only */}
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">✕</button>

        <div className="p-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-900 text-sm" style={{ background: `${C}20`, border: `1px solid ${C}40`, color: C }}>G</div>
            <span className="font-display font-800 text-sm" style={{ color: C }}>Growence</span>
            <span className="font-display font-800 text-sm text-white">Media</span>
          </Link>
        </div>
        <div className="p-4">
          <div className="rounded-xl p-3 text-center" style={{ background: `${A}12`, border: `1px solid ${A}25` }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-display font-900 text-white" style={{ background: A }}>{profile?.username?.charAt(0).toUpperCase() || "U"}</div>
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
          <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition">💬 واتساب</a>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition">🚪 خروج</button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 text-lg">☰</button>
              <span className="text-gray-300 font-bold text-sm hidden sm:block">أهلاً، {profile?.username}</span>
              <span className="text-gray-300 font-bold text-sm sm:hidden">{profile?.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 hidden sm:inline">الرصيد</span>
                <div className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{ background: `${C}15`, color: C }}>${profile?.balance?.toFixed(2) || "0.00"}</div>
              </div>
              <button className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition whitespace-nowrap" onClick={() => setActiveView("add_funds")}>+ <span className="hidden sm:inline">إضافة </span>رصيد</button>
            </div>
          </div>

          {/* Stats bar - mobile friendly */}
          <div className="flex items-center gap-3 px-3 sm:px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-gray-500">الإنفاق</span>
              <span className="text-xs font-bold" style={{ color: A }}>${profile?.total_spent?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-gray-500">الطلبات</span>
              <span className="text-xs font-bold text-gray-300">{(orders.length > 0 ? Math.max(...orders.map((o: any) => o.order_number || 0)) : 279837).toLocaleString()}</span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: "الطلبات", value: (orders.length > 0 ? Math.max(...orders.map((o: any) => o.order_number || 0)) : 279837).toLocaleString(), icon: "📊", color: C },
              { label: "الإنفاق", value: `$${(profile?.total_spent || 0).toFixed(2)}`, icon: "💵", color: "#10b981" },
              { label: "المستوى", value: `${profile?.level || 1}`, icon: "🏆", color: A },
              { label: "الرصيد", value: `$${(profile?.balance || 0).toFixed(2)}`, icon: "👁️", color: "#3b82f6" },
            ].map((s, i) => (
              <div key={i} className="card-dark p-3">
                <div className="flex items-center justify-between mb-1"><span className="text-gray-500 text-xs">{s.label}</span><span className="text-sm">{s.icon}</span></div>
                <div className="font-display text-lg font-900" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════════════ */}
          {/* ═══ NEW ORDER ═══ */}
          {/* ═══════════════════════════════════ */}
          {activeView === "new_order" && (
            <>
              {/* ── Platform Filter Bar ── */}
              <div className="mb-5">
                <h3 className="text-gray-400 text-sm font-bold mb-3">اختر شبكة اجتماعية</h3>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_FILTERS.map((p) => (
                    <button key={p.key}
                      onClick={() => { setActivePlatform(p.key); setSelectedCatId(""); setSelectedService(null); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all"
                      style={activePlatform === p.key
                        ? { background: `${A}`, borderColor: A, color: "white", boxShadow: `-3px 4px 0px 0px ${A}88` }
                        : { background: "#1a1a28", borderColor: "#2a2a40", color: "#9ca3af" }
                      }>
                      <span className="opacity-80">{PlatformSvg[p.key]}</span>
                      <span className="hidden sm:inline">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* ── Order Form (3 cols) ── */}
                <div className="lg:col-span-3 card-dark p-5">
                  {/* Search with dropdown */}
                  <div className="mb-4 relative z-40">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm z-10">🔍</span>
                    <input type="search" value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setSearchFocused(false); } else { setSearchFocused(true); } }}
                      onFocus={() => { if (searchQuery.trim().length >= 2) setSearchFocused(true); }}
                      placeholder="بحث عن خدمة أو فئة..." className="admin-input !pr-10" />
                    
                    {/* Search Dropdown */}
                    {searchFocused && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden max-h-80 overflow-y-auto"
                        style={{ background: "#1a1a28", border: "1px solid #2a2a40", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-white/5 sticky top-0" style={{ background: "#1a1a28" }}>
                          {searchResults.length} نتيجة
                        </div>
                        {searchResults.map((svc) => (
                          <button key={svc.id}
                            className="w-full text-right px-3 py-2.5 hover:bg-white/[0.05] transition flex items-start gap-3 border-b border-white/[0.03]"
                            onClick={() => {
                              setSelectedCatId(svc.category_id);
                              setSelectedService(svc);
                              setSearchQuery("");
                              setSearchFocused(false);
                              setOrderQuantity("");
                            }}>
                            <span className="text-gray-600 font-mono text-xs mt-0.5 shrink-0">{svc.api_service_id}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-200 text-sm truncate">{svc.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">{(svc as any).category?.name}</span>
                                <span className="text-xs font-bold" style={{ color: A }}>${svc.price_per_1000}/1K</span>
                                {svc.can_refill && <span className="text-xs text-green-500">♻️</span>}
                                {svc.can_cancel && <span className="text-xs text-red-500">❌</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchFocused && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl px-4 py-6 text-center text-gray-500 text-sm"
                        style={{ background: "#1a1a28", border: "1px solid #2a2a40" }}>
                        لا توجد نتائج لـ &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                  {/* Click outside to close search */}
                  {searchFocused && <div className="fixed inset-0 z-30" onClick={() => setSearchFocused(false)} />}

                  {/* Category Dropdown */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الفئة</label>
                    <select value={selectedCatId}
                      onChange={(e) => { setSelectedCatId(e.target.value); setSelectedService(null); setOrderQuantity(""); }}
                      className="admin-input">
                      <option value="">— اختر فئة ({filteredCategories.length} فئة) —</option>
                      {filteredCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Dropdown */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الخدمة</label>
                    <select value={selectedService?.id || ""}
                      onChange={(e) => { const svc = services.find(s => s.id === e.target.value); setSelectedService(svc || null); setOrderQuantity(""); }}
                      className="admin-input" disabled={!selectedCatId}>
                      <option value="">— اختر خدمة ({filteredServices.length}) —</option>
                      {filteredServices.map((s) => (
                        <option key={s.id} value={s.id}>{s.api_service_id} - {s.name} - ${s.price_per_1000} لكل 1000</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Description */}
                  {selectedService && (
                    <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: "#e4e1ed10", border: "1px solid #2a2a40" }}>
                      <div className="font-bold text-white mb-2">الوصف</div>
                      {selectedService.description && selectedService.description.trim().length > 0 && (
                        <div className="text-gray-400 mb-3 text-xs leading-relaxed whitespace-pre-line">{selectedService.description}</div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-gray-500">⚡ {selectedService.speed}</span>
                        {selectedService.guarantee_days > 0 && selectedService.guarantee_days < 999 && <span className="text-gray-500">♻️ إعادة التعبئة: {selectedService.guarantee_days} يوم ضمان</span>}
                        {selectedService.guarantee_days >= 999 && <span className="text-gray-500">♻️ ضمان مدى الحياة</span>}
                        {selectedService.can_refill && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">♻️ تعويض</span>}
                        {selectedService.can_cancel && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">❌ إلغاء</span>}
                      </div>
                    </div>
                  )}

                  {/* Link */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الرابط</label>
                    <input type="url" value={orderLink} onChange={(e) => setOrderLink(e.target.value)} placeholder="https://instagram.com/..." className="admin-input" dir="ltr" />
                  </div>

                  {/* Quantity */}
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1.5">الكمية</label>
                    <input type="number" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)}
                      placeholder={selectedService ? `الحد الأدنى: ${selectedService.min_quantity} - الأقصى: ${selectedService.max_quantity.toLocaleString()}` : "اختر خدمة أولاً"}
                      className="admin-input" dir="ltr" disabled={!selectedService} />
                    {selectedService && <p className="text-gray-600 text-xs mt-1">الحد الأدنى: {selectedService.min_quantity.toLocaleString()} — الأقصى: {selectedService.max_quantity.toLocaleString()}</p>}
                  </div>

                  {/* Average Time */}
                  {selectedService && (
                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-1.5">متوسط الوقت</label>
                      <div className="rounded-lg px-4 py-2.5 font-bold text-gray-300" style={{ background: "#e4e1ed15" }}>{selectedService.speed}</div>
                    </div>
                  )}

                  {/* Charge */}
                  <div className="mb-5">
                    <label className="block text-gray-400 text-sm mb-1.5">التكلفة</label>
                    <div className="rounded-lg px-4 py-3 font-display font-bold text-xl" style={{ background: "#e4e1ed15", color: A }} dir="ltr">
                      ${orderPrice.toFixed(4)}
                    </div>
                  </div>

                  {/* Submit */}
                  <button onClick={handlePlaceOrder} disabled={!selectedService || !orderLink || !orderQuantity}
                    className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
                    style={{ background: A }}>
                    إرسال
                  </button>
                </div>

                {/* ── Info Panel (2 cols) ── */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">📝 اقرأ قبل الطلب</h4>
                    <ul className="text-gray-500 text-sm space-y-2.5 leading-relaxed">
                      <li>• جميع الحسابات يجب أن تكون <strong className="text-gray-300">عامة</strong> قبل الطلب، وليست خاصة.</li>
                      <li>• يرجى عدم وضع أكثر من طلب لنفس الرابط بنفس الوقت إلا بعد اكتمال الطلب الأول.</li>
                      <li>• لا يمكننا إلغاء/تعديل أي طلب بعد وضعه نهائياً لذلك يرجى التأكد من الطلبات قبل وضعها.</li>
                      <li>• إذا تم تحويل الحساب إلى خاص أو تم حذف المنشور بعد وضع الطلب سيتم اعتبار الطلب مكتمل.</li>
                      <li>• عندما تقوم بوضع طلب جديد فأنت توافق على شروط وأحكام الموقع.</li>
                    </ul>
                  </div>
                  <div className="card-dark p-5">
                    <h4 className="text-white font-bold mb-3">💡 رموز الخدمات</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2"><span className="text-yellow-400">🟡</span><span className="text-gray-400">= أفضل الخدمات</span></div>
                      <div className="flex items-center gap-2"><span className="text-blue-400">🔵</span><span className="text-gray-400">= خاصية تجزئة الطلب مفعّلة</span></div>
                      <div className="flex items-center gap-2"><span className="text-green-400">♻️</span><span className="text-gray-400">= زر التعويض مفعّل</span></div>
                      <div className="flex items-center gap-2"><span className="text-red-400">❌</span><span className="text-gray-400">= زر الإلغاء مفعّل</span></div>
                    </div>
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

          {/* ═══ ORDERS ═══ */}
          {activeView === "orders" && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">طلباتي ({orders.length})</h2>

              {/* Status filter tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { key: "all", label: "الكل" },
                  { key: "pending", label: "قيد الانتظار" },
                  { key: "in_progress", label: "قيد التنفيذ" },
                  { key: "completed", label: "مكتمل" },
                  { key: "partial", label: "جزئي" },
                  { key: "processing", label: "معالجة" },
                  { key: "cancelled", label: "ملغي" },
                ].map((f) => {
                  const count = f.key === "all" ? orders.length : orders.filter(o => o.status === f.key).length;
                  const stColor = f.key === "all" ? A : (ORDER_STATUSES[f.key]?.color || "#888");
                  return (
                    <button key={f.key} onClick={() => setOrderFilter(f.key)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={orderFilter === f.key ? { background: `${stColor}25`, color: stColor, border: `1px solid ${stColor}40` } : { color: "#666", border: "1px solid #222" }}>
                      {f.label} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="mb-4">
                <input type="search" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="بحث برقم الطلب أو الرابط أو الخدمة..." className="admin-input" />
              </div>

              {orders.length === 0 ? <div className="card-dark p-12 text-center text-gray-500">لا توجد طلبات بعد</div> : (
                <div className="overflow-x-auto"><table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500" style={{ background: `${A}10` }}>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>ID</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>التاريخ</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>الرابط</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>التكلفة</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>عدد البدء</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>الكمية</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>الخدمة</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>الحالة</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>المتبقي</th>
                      <th className="py-3 px-2 text-right font-bold" style={{ color: A }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>{displayedOrders.map((o) => {
                    const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                    const svc = (o as any).service;
                    const pid = svc?.provider?.id;
                    const canCancel = svc?.can_cancel && pid && ["pending", "processing", "in_progress"].includes(o.status);
                    const canRefill = svc?.can_refill && pid && ["completed", "partial"].includes(o.status);
                    return (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2.5 px-2 text-white font-bold font-mono">#{(o as any).order_number || o.id?.slice(0, 8)}</td>
                        <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                          {new Date(o.created_at!).toLocaleDateString("ar-EG")}
                          <br /><span className="text-gray-600">{new Date(o.created_at!).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td className="py-2.5 px-2 max-w-[150px]">
                          <a href={o.link} target="_blank" rel="noopener" className="text-blue-400 hover:underline truncate block" dir="ltr">{o.link}</a>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-gray-300">${o.price.toFixed(4)}</td>
                        <td className="py-2.5 px-2 text-gray-400">{o.start_count > 0 ? o.start_count.toLocaleString() : "-"}</td>
                        <td className="py-2.5 px-2 text-white font-bold">{o.quantity.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-gray-300 max-w-[200px]">
                          <span className="text-gray-500 font-mono text-[10px]">{svc?.api_service_id}</span>
                          {" — "}
                          <span className="truncate">{svc?.name || "-"}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-1 rounded-md font-bold" style={{ background: `${st.color}20`, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="py-2.5 px-2 font-bold" style={{ color: o.remains > 0 ? "#f59e0b" : "#555" }}>
                          {o.remains > 0 ? o.remains.toLocaleString() : "0"}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex flex-wrap gap-1">
                            {canRefill && <button onClick={async () => {
                              try {
                                const res = await refillOrder(pid, o.api_order_id);
                                if (res?.refill && !res.refill?.error) {
                                  toast.success(`تم طلب التعويض! رقم: ${res.refill}`);
                                } else {
                                  toast.error(res?.refill?.error || "فشل طلب التعويض");
                                }
                              } catch { toast.error("خطأ"); }
                            }} className="px-2.5 py-1 rounded-md bg-green-500/20 text-green-400 font-bold hover:bg-green-500/30 transition">Refill</button>}

                            {canCancel && <button onClick={async () => {
                              if (!confirm("هل تريد إرسال طلب إلغاء؟ سيتم التحقق من المزوّد.")) return;
                              try {
                                toast("جاري إرسال طلب الإلغاء...");
                                const cancelRes = await cancelOrders(pid, [o.api_order_id]);
                                const cancelData = cancelRes?.[0];
                                if (cancelData?.cancel?.error) { toast.error(`رفض المزوّد: ${cancelData.cancel.error}`); return; }
                                toast("جاري التحقق من حالة الطلب...");
                                await new Promise(r => setTimeout(r, 2000));
                                const statusRes = await getOrderStatus(pid, o.api_order_id);
                                if (!statusRes || statusRes.error) { toast.error("فشل التحقق"); return; }
                                const providerStatus = statusRes.status;
                                const remains = Number(statusRes.remains) || 0;
                                const startCount = Number(statusRes.start_count) || 0;
                                if (providerStatus === "Cancelled" || providerStatus === "Canceled") {
                                  await supabase.from("orders").update({ status: "cancelled", remains: 0, start_count: startCount }).eq("id", o.id);
                                  if (profile) { await supabase.from("profiles").update({ balance: profile.balance + o.price, total_spent: Math.max(0, (profile.total_spent || 0) - o.price) }).eq("id", user.id); }
                                  toast.success(`تم الإلغاء! استرداد $${o.price.toFixed(4)}`);
                                } else if (providerStatus === "Partial") {
                                  const refund = (o.price / o.quantity) * remains;
                                  await supabase.from("orders").update({ status: "partial", remains, start_count: startCount }).eq("id", o.id);
                                  if (refund > 0 && profile) { await supabase.from("profiles").update({ balance: profile.balance + refund, total_spent: Math.max(0, (profile.total_spent || 0) - refund) }).eq("id", user.id); }
                                  toast.success(`تجزّأ: وصل ${o.quantity - remains} من ${o.quantity}. استرداد $${refund.toFixed(4)}`);
                                } else {
                                  const sMap: Record<string, string> = { "Pending": "pending", "Processing": "processing", "In progress": "in_progress", "Completed": "completed" };
                                  await supabase.from("orders").update({ status: sMap[providerStatus] || o.status, remains, start_count: startCount }).eq("id", o.id);
                                  toast(`حالة: ${providerStatus}. لم يتم الإلغاء بعد.`);
                                }
                                await Promise.all([fetchProfile(user.id), fetchOrders(user.id)]);
                              } catch (err) { console.error(err); toast.error("خطأ"); }
                            }} className="px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 font-bold hover:bg-red-500/30 transition">Cancel</button>}

                            {pid && o.api_order_id && <button onClick={async () => {
                              try {
                                const statusRes = await getOrderStatus(pid, o.api_order_id);
                                if (!statusRes || statusRes.error) { toast.error("فشل"); return; }
                                const sMap: Record<string, string> = { "Pending": "pending", "Processing": "processing", "In progress": "in_progress", "Completed": "completed", "Cancelled": "cancelled", "Partial": "partial", "Canceled": "cancelled" };
                                const newStatus = sMap[statusRes.status] || o.status;
                                const remains = Number(statusRes.remains) || 0;
                                const startCount = Number(statusRes.start_count) || 0;
                                if (newStatus === "partial" && o.status !== "partial") {
                                  const refund = (o.price / o.quantity) * remains;
                                  if (refund > 0 && profile) { await supabase.from("profiles").update({ balance: profile.balance + refund, total_spent: Math.max(0, (profile.total_spent || 0) - refund) }).eq("id", user.id); toast.success(`تجزئة: استرداد $${refund.toFixed(4)}`); }
                                }
                                if (newStatus === "cancelled" && o.status !== "cancelled") {
                                  if (profile) { await supabase.from("profiles").update({ balance: profile.balance + o.price, total_spent: Math.max(0, (profile.total_spent || 0) - o.price) }).eq("id", user.id); toast.success(`ملغي: استرداد $${o.price.toFixed(4)}`); }
                                }
                                await supabase.from("orders").update({ status: newStatus, remains, start_count: startCount }).eq("id", o.id);
                                toast(`الحالة: ${statusRes.status} | بدء: ${startCount} | متبقي: ${remains}`);
                                await Promise.all([fetchProfile(user.id), fetchOrders(user.id)]);
                              } catch { toast.error("خطأ"); }
                            }} className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition" title="تحديث الحالة">🔄</button>}
                          </div>
                        </td>
                      </tr>);
                  })}</tbody>
                </table></div>
              )}
            </div>
          )}

          {/* ═══ SERVICES LIST ═══ */}
          {activeView === "services" && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">جميع الخدمات ({services.length})</h2>
              <div className="overflow-x-auto"><table className="w-full text-xs">
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
              </table></div>
            </div>
          )}

          {/* ═══ ADD FUNDS ═══ */}
          {activeView === "add_funds" && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-6">💰 شحن الرصيد</h2>

              {/* Current Balance */}
              <div className="card-dark p-5 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">رصيدك الحالي</div>
                  <div className="text-3xl font-display font-800 mt-1" style={{ color: C }}>${profile?.balance?.toFixed(2) || "0.00"}</div>
                </div>
                <div className="text-5xl opacity-20">💰</div>
              </div>

              {/* Step 1: Choose Method */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3">1️⃣ اختر طريقة الدفع</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(PAYMENT_METHODS).filter(m => m.enabled).map(m => (
                    <button key={m.id} onClick={() => setDepositMethod(m.id)}
                      className={`card-dark p-4 text-center transition-all hover:scale-[1.02] ${depositMethod === m.id ? "!border-green-500/50" : ""}`}
                      style={depositMethod === m.id ? { boxShadow: "0 0 20px rgba(16,185,129,0.15)" } : {}}>
                      <div className="text-3xl mb-2">{m.icon}</div>
                      <div className="text-white font-bold text-sm">{m.name}</div>
                      <div className="text-gray-500 text-[10px] mt-1">{m.description}</div>
                      {depositMethod === m.id && <div className="mt-2 text-xs text-green-400">✓ محدد</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Payment Details (show when method selected) */}
              {depositMethod && (() => {
                const method = PAYMENT_METHODS[depositMethod as keyof typeof PAYMENT_METHODS];
                if (!method) return null;

                // WhatsApp-only method (manual transfer)
                if ((method as any).whatsappOnly) {
                  return (
                    <div className="space-y-4 animate-fade-in">
                      <div className="card-dark p-8 text-center">
                        <div className="text-5xl mb-4">💬</div>
                        <h3 className="text-white font-bold text-lg mb-2">تواصل معنا على واتساب</h3>
                        <p className="text-gray-400 text-sm mb-5">أرسل لنا المبلغ المطلوب وسنرتّب لك طريقة التحويل المناسبة</p>
                        <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أريد شحن رصيد عبر تحويل يدوي")}`}
                          target="_blank" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-white bg-green-600 hover:bg-green-500 transition">
                          💬 فتح واتساب
                        </a>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-5 animate-fade-in">
                    {/* Payment Info Box */}
                    <div className="rounded-xl p-5" style={{ background: "#10b98108", border: "1px solid #10b98120" }}>
                      <h3 className="text-sm font-bold text-green-400 mb-3">📋 معلومات الدفع — {method.name}</h3>

                      {/* QR Code if available */}
                      {(method as any).qrCode && (
                        <div className="text-center mb-4">
                          <img src={(method as any).qrCode} alt="QR Code" className="mx-auto rounded-xl" style={{ background: "white", padding: "8px", maxWidth: "200px" }} />
                          <p className="text-gray-500 text-[10px] mt-2">امسح الكود للدفع</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {method.details.map((d, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <span className="text-gray-400 text-sm">{d.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono text-sm" dir="ltr">{d.value}</span>
                              <button onClick={() => { navigator.clipboard.writeText(d.value); toast.success("تم النسخ!"); }}
                                className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 hover:text-white">نسخ</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {method.instructions && <p className="text-gray-500 text-xs mt-3 leading-relaxed whitespace-pre-line">💡 {method.instructions}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 mb-2">2️⃣ المبلغ (بالدولار)</h3>
                      <input type="number" step="0.01" min={method.minAmount} value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder={`الحد الأدنى $${method.minAmount}`}
                        className="admin-input text-lg font-bold" dir="ltr" />
                      {/* Quick amounts */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[5, 10, 25, 50, 100, 250].map(v => (
                          <button key={v} onClick={() => setDepositAmount(String(v))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${depositAmount === String(v) ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                            style={depositAmount === String(v) ? { background: `${A}25`, color: A } : { background: "rgba(255,255,255,0.03)" }}>
                            ${v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transaction ID — for ALL methods */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 mb-2">3️⃣ رقم العملية / Transaction ID</h3>
                      <input type="text" value={depositTxId} onChange={e => setDepositTxId(e.target.value)}
                        placeholder={depositMethod === "manual" ? "رقم التحويل أو اسمك في الإيصال" : "الصق Transaction ID هنا بعد الدفع"}
                        className="admin-input" dir="ltr" />
                    </div>

                    {/* Submit */}
                    <button onClick={handleManualDeposit} disabled={depositSubmitting || !depositAmount || !depositTxId.trim()}
                      className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: `linear-gradient(135deg, ${A}, ${A}cc)` }}>
                      {depositSubmitting ? "جاري الإرسال..." : `📩 إرسال طلب شحن $${depositAmount || "0"}`}
                    </button>

                    {/* After submit instructions */}
                    <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: "#10b98108", border: "1px solid #10b98120" }}>
                      <span className="text-green-400 font-bold">📋 بعد الدفع:</span>
                      <div className="text-gray-400 mt-2 space-y-1.5">
                        <div>1️⃣ ادفع المبلغ عبر الطريقة المختارة</div>
                        <div>2️⃣ أدخل رقم العملية أعلاه واضغط إرسال</div>
                        <div>3️⃣ <strong className="text-white">تواصل معنا لتأكيد الدفع:</strong></div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أريد تأكيد شحن رصيد بقيمة $" + (depositAmount || "..."))}`}
                            target="_blank" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition">
                            💬 واتساب
                          </a>
                          <button onClick={() => { setActiveView("tickets" as any); setTimeout(() => setShowNewTicket(true), 100); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition" style={{ background: C }}>
                            🎫 فتح تذكرة دعم
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="rounded-xl p-4 text-xs text-gray-500 leading-relaxed" style={{ background: "#f59e0b08", border: "1px solid #f59e0b15" }}>
                      <span className="text-yellow-400 font-bold">⚠️ تنبيه:</span> تأكد من إرسال المبلغ الصحيح قبل تقديم الطلب. الطلبات المرفوضة بسبب معلومات خاطئة لا يتم استرجاعها.
                      يتم مراجعة الطلبات خلال 5 دقائق - 24 ساعة حسب طريقة الدفع.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ DEPOSITS HISTORY ═══ */}
          {activeView === "deposits" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">📜 سجل الشحن ({deposits.length})</h2>
                <button onClick={() => setActiveView("add_funds")} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>+ شحن جديد</button>
              </div>

              {deposits.length === 0 ? (
                <div className="card-dark p-16 text-center">
                  <div className="text-5xl mb-4 opacity-30">📜</div>
                  <div className="text-gray-500 mb-2">لا توجد عمليات شحن</div>
                  <button onClick={() => setActiveView("add_funds")} className="text-sm font-bold mt-2" style={{ color: A }}>اشحن الآن ←</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deposits.map(d => {
                    const ds = DEPOSIT_STATUSES[d.status] || DEPOSIT_STATUSES.pending;
                    const method = PAYMENT_METHODS[d.method as keyof typeof PAYMENT_METHODS];
                    return (
                      <div key={d.id} className="card-dark p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${ds.color}10` }}>
                          {method?.icon || "💳"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-bold">${d.amount.toFixed(2)}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${ds.color}15`, color: ds.color }}>{ds.label}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {method?.name || d.method} • {d.transaction_id ? `TX: ${d.transaction_id.slice(0, 20)}...` : ""}
                          </div>
                          {d.admin_note && <div className="text-xs mt-1 text-yellow-400/70">💬 {d.admin_note}</div>}
                        </div>
                        <div className="text-left shrink-0 flex flex-col items-end gap-1">
                          <div className="text-[10px] text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                          {d.status === "pending" && (
                            <a href={`https://wa.me/${STORE.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`مرحباً، أريد تأكيد شحن رصيد $${d.amount} — TX: ${d.transaction_id || ""}`)}`}
                              target="_blank" className="text-[10px] px-2 py-0.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25">💬 تأكيد</a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ SUPPORT TICKETS ═══ */}
          {activeView === "tickets" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">🎫 تذاكر الدعم ({tickets.length})</h2>
                <button onClick={() => setShowNewTicket(!showNewTicket)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: A }}>
                  {showNewTicket ? "✕ إغلاق" : "+ تذكرة جديدة"}
                </button>
              </div>

              {/* New Ticket Form */}
              {showNewTicket && (
                <div className="card-dark p-5 mb-5 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-400 mb-3">📝 إرسال تذكرة جديدة</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">الموضوع</label>
                      <input type="text" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)}
                        placeholder="مثال: مشكلة في طلب #12345" className="admin-input" maxLength={200} />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">تفاصيل المشكلة</label>
                      <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)}
                        placeholder="اشرح مشكلتك بالتفصيل... يمكنك إضافة روابط الطلبات أو لقطات شاشة"
                        className="admin-input !h-32 resize-none" maxLength={2000} />
                      <div className="text-left text-[10px] text-gray-600 mt-1">{ticketMessage.length}/2000</div>
                    </div>
                    <button onClick={async () => {
                      if (!ticketSubject.trim() || !ticketMessage.trim()) { toast.error("الرجاء تعبئة الموضوع والرسالة"); return; }
                      setTicketSubmitting(true);
                      try {
                        const { error } = await supabase.from("support_tickets").insert({
                          user_id: user.id,
                          subject: ticketSubject.trim(),
                          message: ticketMessage.trim(),
                          status: "open",
                          priority: "normal",
                        });
                        if (error) throw error;
                        toast.success("تم إرسال التذكرة بنجاح! سيتم الرد عليها قريباً ✓");
                        setTicketSubject(""); setTicketMessage(""); setShowNewTicket(false);
                        fetchTickets(user.id);
                      } catch (err: any) { toast.error(err.message || "خطأ في إرسال التذكرة"); }
                      finally { setTicketSubmitting(false); }
                    }} disabled={ticketSubmitting || !ticketSubject.trim() || !ticketMessage.trim()}
                      className="w-full py-3 rounded-xl font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: A }}>
                      {ticketSubmitting ? "جاري الإرسال..." : "📩 إرسال التذكرة"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tickets List */}
              {tickets.length === 0 ? (
                <div className="card-dark p-16 text-center">
                  <div className="text-5xl mb-4 opacity-30">🎫</div>
                  <div className="text-gray-500 mb-2">لا توجد تذاكر دعم</div>
                  <button onClick={() => setShowNewTicket(true)} className="text-sm font-bold mt-2" style={{ color: A }}>أرسل تذكرة الآن ←</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(t => {
                    const ts = TICKET_STATUSES[t.status] || TICKET_STATUSES.open;
                    return (
                      <div key={t.id} className="card-dark p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${ts.color}15`, color: ts.color }}>{ts.label}</span>
                              <span className="text-[10px] text-gray-600">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                            </div>
                            <h4 className="text-white font-bold text-sm">{t.subject}</h4>
                          </div>
                        </div>
                        <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mb-2">{t.message}</div>
                        {t.admin_reply && (
                          <div className="mt-3 rounded-xl p-3" style={{ background: `${C}08`, border: `1px solid ${C}20` }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-bold" style={{ color: C }}>💬 رد الإدارة</span>
                              {t.updated_at && <span className="text-[10px] text-gray-600">{new Date(t.updated_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                            </div>
                            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{t.admin_reply}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ AFFILIATE / REFERRAL ═══ */}
          {activeView === "affiliate" && (() => {
            // Lazy load referrals
            if (referrals.length === 0 && profile?.id) {
              fetchReferrals(profile.id);
              fetchCommissions(profile.id);
            }
            const refLink = typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${profile?.referral_code || ""}` : "";
            return (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">🤝 نظام الإحالة</h2>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "أرباح الإحالة", value: `$${(profile?.referral_earnings || 0).toFixed(2)}`, icon: "💰", color: "#10b981" },
                    { label: "نسبة العمولة", value: `${profile?.referral_rate || 5}%`, icon: "📊", color: A },
                    { label: "المُحالين", value: String(referrals.length), icon: "👥", color: C },
                    { label: "العمولات", value: String(commissions.length), icon: "🧾", color: "#f59e0b" },
                  ].map((s, i) => (
                    <div key={i} className="card-dark p-3">
                      <div className="flex items-center justify-between mb-1"><span className="text-gray-500 text-xs">{s.label}</span><span className="text-sm">{s.icon}</span></div>
                      <div className="font-display text-lg font-900" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Referral Link */}
                <div className="card-dark p-5 mb-5">
                  <h3 className="text-sm font-bold text-gray-400 mb-3">🔗 رابط الإحالة الخاص بك</h3>
                  <div className="flex gap-2">
                    <input type="text" value={refLink} readOnly className="admin-input flex-1 !text-xs" dir="ltr" />
                    <button onClick={() => { navigator.clipboard.writeText(refLink); toast.success("تم نسخ الرابط!"); }}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0" style={{ background: A }}>📋 نسخ</button>
                  </div>
                  <div className="mt-3 rounded-xl p-3 text-xs text-gray-500 leading-relaxed" style={{ background: "#10b98108", border: "1px solid #10b98115" }}>
                    <span className="text-green-400 font-bold">💡 كيف يعمل:</span> شارك رابط الإحالة مع أصدقائك. عندما يسجّل شخص عبر رابطك ويشتري خدمات، تحصل على <span className="text-green-400 font-bold">{profile?.referral_rate || 5}%</span> عمولة تلقائياً على كل طلب مكتمل!
                  </div>
                  {/* Referral Code */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-gray-500 text-xs">كود الإحالة:</span>
                    <span className="font-mono font-bold text-sm" style={{ color: A }}>{profile?.referral_code || "..."}</span>
                    <button onClick={() => { navigator.clipboard.writeText(profile?.referral_code || ""); toast.success("تم النسخ!"); }}
                      className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 hover:text-white">نسخ</button>
                  </div>
                </div>

                {/* Referred Users */}
                <div className="card-dark p-5 mb-5">
                  <h3 className="text-sm font-bold text-gray-400 mb-3">👥 المستخدمين المُحالين ({referrals.length})</h3>
                  {referrals.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-sm">لا يوجد مُحالين بعد — شارك رابطك!</div>
                  ) : (
                    <div className="space-y-2">
                      {referrals.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `${C}30` }}>{r.username?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="text-white text-sm font-bold">{r.username}</div>
                              <div className="text-gray-600 text-[10px]">{r.created_at ? new Date(r.created_at).toLocaleDateString("ar-EG") : ""}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">إنفاق: ${(r.total_spent || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commission History */}
                <div className="card-dark p-5">
                  <h3 className="text-sm font-bold text-gray-400 mb-3">🧾 سجل العمولات ({commissions.length})</h3>
                  {commissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-sm">لا توجد عمولات بعد</div>
                  ) : (
                    <div className="overflow-x-auto"><table className="w-full text-xs">
                      <thead><tr className="border-b border-white/5 text-gray-500">
                        <th className="py-2 px-2 text-right">التاريخ</th>
                        <th className="py-2 px-2 text-right">مبلغ الطلب</th>
                        <th className="py-2 px-2 text-right">النسبة</th>
                        <th className="py-2 px-2 text-right">العمولة</th>
                      </tr></thead>
                      <tbody>{commissions.map((c) => (
                        <tr key={c.id} className="border-b border-white/5">
                          <td className="py-2 px-2 text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : ""}</td>
                          <td className="py-2 px-2 text-gray-300">${c.order_amount.toFixed(4)}</td>
                          <td className="py-2 px-2 text-gray-400">{c.commission_rate}%</td>
                          <td className="py-2 px-2 font-bold" style={{ color: "#10b981" }}>+${c.commission_amount.toFixed(4)}</td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ═══ SETTINGS ═══ */}
          {activeView === "settings" && (
            <div className="max-w-lg">
              <h2 className="text-lg font-bold text-white mb-4">إعدادات الحساب</h2>
              <div className="card-dark p-6 space-y-4">
                <div><label className="block text-gray-400 text-sm mb-1">اسم المستخدم</label><input value={profile?.username || ""} className="admin-input" readOnly dir="ltr" /></div>
                <div><label className="block text-gray-400 text-sm mb-1">البريد</label><input value={user?.email || ""} className="admin-input" readOnly dir="ltr" /></div>
                <div><label className="block text-gray-400 text-sm mb-1">المستوى</label><div className="admin-input !bg-dark-800">المستوى {profile?.level || 1} — خصم {profile?.discount || 0}%</div></div>
              </div>

              {/* API Key Section */}
              <div className="card-dark p-6 mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-400">🔑 مفتاح API (للموزّعين)</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${profile?.api_enabled ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                    {profile?.api_enabled ? "مُفعّل" : "غير مُفعّل"}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type={showApiKey ? "text" : "password"} value={profile?.api_key || "..."} readOnly className="admin-input flex-1 !text-xs font-mono" dir="ltr" />
                    <button onClick={() => setShowApiKey(!showApiKey)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-gray-400 hover:text-white shrink-0">
                      {showApiKey ? "🙈 إخفاء" : "👁️ عرض"}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(profile?.api_key || ""); toast.success("تم نسخ المفتاح!"); }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-gray-400 hover:text-white shrink-0">📋</button>
                  </div>
                  <div className="rounded-xl p-3 text-xs text-gray-500 leading-relaxed" style={{ background: "#6c5ce708", border: "1px solid #6c5ce715" }}>
                    <span className="font-bold" style={{ color: C }}>📡 API Endpoint:</span>
                    <div className="font-mono text-[10px] mt-1 p-2 rounded bg-black/30 text-gray-400" dir="ltr">
                      POST {typeof window !== "undefined" ? window.location.origin : ""}/api/v2
                    </div>
                    <div className="mt-2">
                      <span className="font-bold text-gray-400">الإجراءات المتاحة:</span> services, balance, add, status, refill, cancel
                    </div>
                    <div className="mt-1">
                      <span className="font-bold text-gray-400">المفاتيح المطلوبة:</span> key (API Key) + action
                    </div>
                  </div>
                  {!profile?.api_enabled && (
                    <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "#f59e0b08", border: "1px solid #f59e0b15" }}>
                      <span className="text-yellow-400 font-bold">⚠️</span> الـ API غير مُفعّل حالياً. تواصل مع الإدارة لتفعيله.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
