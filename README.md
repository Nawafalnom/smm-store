# SMM Store - متجر خدمات التسويق الإلكتروني

متجر احترافي لـ 5 براندات خدمات السوشال ميديا - مبني بـ Next.js + Supabase + Vercel.

## المميزات

- ✅ متجر واحد يجمع 5 براندات (كل براند بتصميم خاص)
- ✅ لوحة تحكم Admin كاملة (إضافة/تعديل/حذف الباقات)
- ✅ Facebook Pixel لكل براند (PageView + Lead + Purchase)
- ✅ فورم طلب → تحويل تلقائي على واتساب البراند
- ✅ تصميم Dark احترافي عربي RTL مع ألوان نيون
- ✅ دعم 4 عملات (ليرة سورية، جنيه مصري، دولار، ريال سعودي)
- ✅ حفظ الطلبات في Supabase
- ✅ متجاوب بالكامل (موبايل + ديسكتوب)

## البراندات

| Brand | Color | WhatsApp |
|-------|-------|----------|
| Social Waves | Cyan | +4915213008449 |
| Boost In Syria | Green | +201034735130 |
| Rumor For Media | Purple | +12266771434 |
| Fivestars Marketing | Gold | +966572972393 |
| Social Spark | Orange | +966570791837 |

## خطوات الإعداد

### 1. إعداد Supabase

1. افتح مشروعك على Supabase: https://modwoejwcunybgqonjaf.supabase.co
2. اذهب إلى **SQL Editor**
3. الصق محتوى ملف `supabase-setup.sql` وشغّله
4. (اختياري) أزل التعليق عن بيانات العينة وشغّلها

### 2. إعداد Environment Variables

عدّل ملف `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://modwoejwcunybgqonjaf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
NEXT_PUBLIC_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
```

خذ الـ anon key من:
Supabase Dashboard → Settings → API → Project API keys → anon/public

### 3. تثبيت وتشغيل محلياً

```bash
npm install
npm run dev
```

افتح http://localhost:3000

### 4. رفع على Vercel

```bash
# عبر Vercel CLI
npm i -g vercel
vercel

# أو ارفع المجلد على GitHub وربطه بـ Vercel
```

أضف الـ Environment Variables في Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ADMIN_PASSWORD`

## الروابط

- **الصفحة الرئيسية**: `/`
- **صفحة براند**: `/brand/social-waves`, `/brand/boost-in-syria`, إلخ
- **لوحة التحكم**: `/admin`

## هيكل المشروع

```
src/
├── app/
│   ├── layout.tsx          # Layout رئيسي
│   ├── page.tsx            # الصفحة الرئيسية
│   ├── brand/[slug]/
│   │   └── page.tsx        # صفحة البراند (ديناميكية)
│   └── admin/
│       └── page.tsx        # لوحة التحكم
├── components/
│   └── FacebookPixel.tsx   # Facebook Pixel
├── lib/
│   └── supabase.ts         # Supabase client + types + config
└── styles/
    └── globals.css          # Global styles + Tailwind
```
