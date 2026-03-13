import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ───
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  balance: number;
  total_spent: number;
  level: number;
  discount: number;
  created_at?: string;
}

export interface Category {
  id?: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Service {
  id?: string;
  category_id: string;
  name: string;
  platform: string;
  api_service_id: number;
  price_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  speed: string;
  guarantee_days: number;
  description: string;
  can_refill: boolean;
  can_cancel: boolean;
  is_active: boolean;
  sort_order: number;
  category?: Category;
}

export interface Order {
  id?: string;
  user_id: string;
  service_id: string;
  api_order_id: string;
  link: string;
  quantity: number;
  price: number;
  status: string;
  start_count: number;
  remains: number;
  created_at?: string;
  service?: Service;
}

// ─── Store Config ───
export const STORE = {
  name: "Growence Media",
  nameAr: "جروينس ميديا",
  whatsapp: "+966571373367",
  pixel: "",
  color: "#6c5ce7",
  colorRgb: "108, 92, 231",
  accentColor: "#ff6b35",
  accentRgb: "255, 107, 53",
  description: "خدمات تسويق إلكتروني احترافية — متابعين، لايكات، مشاهدات لجميع المنصات",
};

export const PLATFORMS = [
  "فيسبوك", "انستجرام", "تيك توك", "يوتيوب",
  "تويتر", "سناب شات", "تيليجرام", "ثريدز",
  "سبوتيفاي", "لينكدإن", "جوجل", "واتساب", "كواي", "أخرى",
];

export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#f59e0b" },
  processing: { label: "قيد التنفيذ", color: "#3b82f6" },
  in_progress: { label: "جاري التنفيذ", color: "#8b5cf6" },
  completed: { label: "مكتمل", color: "#10b981" },
  cancelled: { label: "ملغي", color: "#ef4444" },
  partial: { label: "جزئي", color: "#f97316" },
};
