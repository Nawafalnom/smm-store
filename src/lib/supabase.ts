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

export interface Provider {
  id?: string;
  name: string;
  api_url: string;
  api_key: string;
  balance: number;
  is_active: boolean;
  sort_order: number;
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
  provider_id: string;
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

// ─── Deposit / Payment Config ───
export interface Deposit {
  id?: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id: string;
  proof_url: string;
  admin_note: string;
  deposit_number?: number;
  created_at?: string;
  updated_at?: string;
}

export const DEPOSIT_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد المراجعة", color: "#f59e0b" },
  approved: { label: "تم القبول", color: "#10b981" },
  rejected: { label: "مرفوض", color: "#ef4444" },
  expired: { label: "منتهي", color: "#6b7280" },
};

export const PAYMENT_METHODS = {
  manual: {
    id: "manual",
    name: "تحويل يدوي",
    nameEn: "Manual Transfer",
    icon: "🏦",
    description: "تحويل بنكي أو واتساب — يتم التأكيد خلال 1-24 ساعة",
    minAmount: 1,
    details: [
      { label: "واتساب", value: "+966571373367" },
    ],
    instructions: "أرسل المبلغ ثم أدخل رقم العملية أو أرسل لنا إيصال الدفع على واتساب",
    enabled: true,
  },
  usdt_trc20: {
    id: "usdt_trc20",
    name: "USDT (TRC20)",
    nameEn: "USDT TRC20",
    icon: "💎",
    description: "تحويل USDT على شبكة Tron — تأكيد خلال 5-30 دقيقة",
    minAmount: 5,
    details: [
      { label: "الشبكة", value: "TRC20 (Tron)" },
      { label: "العنوان", value: "TYourTRC20WalletAddressHere" },
    ],
    instructions: "أرسل USDT إلى العنوان أعلاه ثم الصق Transaction Hash في الحقل",
    enabled: true,
  },
  binance_pay: {
    id: "binance_pay",
    name: "Binance Pay",
    nameEn: "Binance Pay",
    icon: "🔶",
    description: "دفع عبر Binance Pay — فوري ومجاني",
    minAmount: 5,
    details: [
      { label: "Binance ID", value: "YourBinancePayIDHere" },
      { label: "البريد", value: "pay@growence.media" },
    ],
    instructions: "افتح Binance → Pay → Send → أدخل الـ ID أعلاه → أرسل المبلغ → الصق Order ID",
    enabled: true,
  },
};
