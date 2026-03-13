import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Types ----------
export interface Package {
  id?: string;
  platform: string;
  service: string;
  quantity: string;
  price_syp: number;
  price_egp: number;
  price_usd: number;
  price_sar: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Order {
  id?: string;
  package_id: string;
  customer_name: string;
  customer_phone: string;
  customer_account: string;
  currency: string;
  total_price: number;
  status: string;
  created_at?: string;
}

// ---------- Store Config ----------
export const STORE = {
  name: "Growence Media",
  nameAr: "جروينس ميديا",
  whatsapp: "+966571373367",
  pixel: "",
  color: "#6c5ce7",
  colorRgb: "108, 92, 231",
  description: "خدمات تسويق إلكتروني احترافية — متابعين، لايكات، مشاهدات لجميع المنصات",
};

export const PLATFORMS = [
  "فيسبوك",
  "انستجرام",
  "تيك توك",
  "يوتيوب",
  "تويتر",
  "سناب شات",
  "تيليجرام",
  "ثريدز",
];

export const SERVICES = [
  "متابعين",
  "لايكات",
  "مشاهدات",
  "تعليقات",
  "مشتركين",
  "مشاركات",
  "ريتويت",
  "حفظ",
];

export const CURRENCIES: Record<string, { symbol: string; label: string; key: keyof Package }> = {
  SYP: { symbol: "ل.س", label: "ليرة سورية", key: "price_syp" as keyof Package },
  EGP: { symbol: "ج.م", label: "جنيه مصري", key: "price_egp" as keyof Package },
  USD: { symbol: "$", label: "دولار أمريكي", key: "price_usd" as keyof Package },
  SAR: { symbol: "ر.س", label: "ريال سعودي", key: "price_sar" as keyof Package },
};
