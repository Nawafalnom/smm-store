import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Types ----------
export interface Brand {
  slug: string;
  name: string;
  nameAr: string;
  whatsapp: string;
  pixel: string;
  color: string;
  colorRgb: string;
  gradient: string;
  description: string;
}

export interface Package {
  id?: string;
  brand_slug: string;
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
  brand_slug: string;
  package_id: string;
  customer_name: string;
  customer_phone: string;
  customer_account: string;
  currency: string;
  total_price: number;
  status: string;
  created_at?: string;
}

// ---------- Brands Config ----------
export const BRANDS: Brand[] = [
  {
    slug: "social-waves",
    name: "Social Waves",
    nameAr: "سوشال ويفز",
    whatsapp: "+4915213008449",
    pixel: "1590061585608534",
    color: "#00d4ff",
    colorRgb: "0, 212, 255",
    gradient: "from-cyan-500 to-blue-600",
    description: "خدمات تسويق إلكتروني احترافية لتعزيز تواجدك الرقمي",
  },
  {
    slug: "boost-in-syria",
    name: "Boost In Syria",
    nameAr: "بوست إن سيريا",
    whatsapp: "+201034735130",
    pixel: "921689210562511",
    color: "#00ff88",
    colorRgb: "0, 255, 136",
    gradient: "from-emerald-400 to-green-600",
    description: "حلول متكاملة لزيادة التفاعل والمتابعين في سوريا",
  },
  {
    slug: "rumor-for-media",
    name: "Rumor For Media",
    nameAr: "رومر فور ميديا",
    whatsapp: "+12266771434",
    pixel: "1254907010139384",
    color: "#c840ff",
    colorRgb: "200, 64, 255",
    gradient: "from-purple-500 to-fuchsia-600",
    description: "خدمات إعلامية متقدمة لنشر علامتك التجارية",
  },
  {
    slug: "fivestars-marketing",
    name: "Fivestars Marketing",
    nameAr: "فايف ستارز ماركتنج",
    whatsapp: "+966572972393",
    pixel: "1228104639525734",
    color: "#ffd700",
    colorRgb: "255, 215, 0",
    gradient: "from-yellow-400 to-amber-600",
    description: "تسويق خمس نجوم لأعمالك على جميع المنصات",
  },
  {
    slug: "social-spark",
    name: "Social Spark",
    nameAr: "سوشال سبارك",
    whatsapp: "+966570791837",
    pixel: "1944658703076913",
    color: "#ff4d00",
    colorRgb: "255, 77, 0",
    gradient: "from-orange-500 to-red-600",
    description: "أشعل حساباتك بخدمات تسويق مبتكرة وفعّالة",
  },
];

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

export function getBrand(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}
