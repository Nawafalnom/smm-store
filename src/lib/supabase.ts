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
  api_key?: string;
  api_enabled?: boolean;
  referral_code?: string;
  referred_by?: string;
  referral_earnings?: number;
  referral_rate?: number;
  created_at?: string;
}

export interface SupportTicket {
  id?: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralCommission {
  id?: string;
  referrer_id: string;
  referred_id: string;
  order_id: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at?: string;
}

export const TICKET_STATUSES: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "#f59e0b" },
  in_progress: { label: "قيد المعالجة", color: "#3b82f6" },
  resolved: { label: "تم الرد", color: "#10b981" },
  closed: { label: "مغلقة", color: "#6b7280" },
};

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
  site_id?: number;
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
  binance_pay: {
    id: "binance_pay",
    name: "Binance Pay",
    nameEn: "Binance Pay",
    icon: "🔶",
    description: "ادفع عبر Binance Pay يدوياً — تأكيد خلال 5-30 دقيقة",
    minAmount: 1,
    qrCode: "https://www2.0zz0.com/2026/01/16/15/195538412.png",
    details: [
      { label: "Binance Pay ID", value: "1027009797" },
      { label: "العملة", value: "USDT" },
    ],
    instructions: "1. امسح الـ QR أو أرسل USDT للـ Pay ID أعلاه\n2. أدخل Transaction ID بالأسفل\n3. تواصل واتساب أو افتح تذكرة لتأكيد الدفع",
    enabled: true,
  },
  usdt_bep20: {
    id: "usdt_bep20",
    name: "USDT (BEP20)",
    nameEn: "USDT BEP20",
    icon: "💛",
    description: "تحويل USDT على شبكة BNB Smart Chain — تأكيد خلال 5-15 دقيقة",
    minAmount: 1,
    qrCode: "/qr/bep20.jpg",
    details: [
      { label: "الشبكة", value: "BEP20 (BSC)" },
      { label: "العنوان", value: "0x15986c412a3b3802a80c6b0a7182aeb8409e8bfe" },
    ],
    instructions: "أرسل USDT (BEP20) إلى العنوان أعلاه ثم الصق Transaction Hash في الحقل",
    enabled: true,
  },
  usdt_trc20: {
    id: "usdt_trc20",
    name: "USDT (TRC20)",
    nameEn: "USDT TRC20",
    icon: "💎",
    description: "تحويل USDT على شبكة Tron — تأكيد خلال 5-30 دقيقة",
    minAmount: 1,
    qrCode: "/qr/trc20.jpg",
    details: [
      { label: "الشبكة", value: "TRC20 (Tron)" },
      { label: "العنوان", value: "TQ8BCjYVYZFBJJZu25bQJejvtqaFarZVWq" },
    ],
    instructions: "أرسل USDT (TRC20) إلى العنوان أعلاه ثم الصق Transaction Hash في الحقل",
    enabled: true,
  },
  sham_cash: {
    id: "sham_cash",
    name: "شام كاش",
    nameEn: "Sham Cash",
    icon: "💚",
    qrCode: "/qr/shamcash.jpg",
    description: "الدفع بالدولار أو الليرة السورية — الحد الأدنى $5",
    minAmount: 5,
    details: [
      { label: "كود شام كاش", value: "36979014d0a570847fb5e5371a886626" },
      { label: "الاسم", value: "Nawaf_Al" },
      { label: "العملة", value: "USD أو SYP (سعر الصرف 125 ل.س)" },
      { label: "الحد الأدنى", value: "$5" },
    ],
    instructions: "1. انسخ كود شام كاش أعلاه وادفع عبر التطبيق\n2. أدخل رقم العملية بالأسفل\n3. تواصل واتساب أو افتح تذكرة لتأكيد الدفع مع صورة التحويل",
    enabled: true,
  },
  syriatel_cash: {
    id: "syriatel_cash",
    name: "سيريتل كاش",
    nameEn: "Syriatel Cash",
    icon: "📱",
    description: "للعملاء داخل سوريا فقط — عمولة 10% — تأكيد خلال 5-30 دقيقة",
    minAmount: 1,
    details: [
      { label: "الكود الأول", value: "96090396" },
      { label: "الكود الثاني (احتياطي)", value: "79089688" },
      { label: "الحد الأدنى", value: "1,000 ل.س" },
      { label: "العمولة", value: "10%" },
    ],
    instructions: "⚠️ التحويل يجب أن يكون عبر خيار التحويل اليدوي فقط! أي طريقة أخرى قد تُرفض. استخدم الكود الأول، وإذا لم يعمل جرّب الثاني. بعد التحويل أدخل رقم العملية وتواصل واتساب للتأكيد.",
    enabled: true,
  },
  manual: {
    id: "manual",
    name: "تحويل يدوي",
    nameEn: "Manual Transfer",
    icon: "🏦",
    description: "تواصل معنا على واتساب لترتيب التحويل",
    minAmount: 1,
    whatsappOnly: true,
    details: [],
    instructions: "",
    enabled: true,
  },
};
