import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Growence Media | أفضل وارخص سيرفر بيع وزيادة متابعين",
  description: "أفضل وارخص سيرفر بيع وزيادة متابعين بالشرق الأوسط، زيادة متابعين انستجرام، زيادة متابعين تويتر، زيادة متابعين سناب، وشراء متابعين فيسبوك، وزيادة لايكات ومشاهدات، زيادة مشاهدات يوتيوب، زيادة متابعين تيك توك، وغيرها الكثير من الخدمات",
  keywords: "شراء متابعين انستقرام, زيادة متابعين انستقرام, سيرفر بيع متابعين, زيادة متابعين تويتر, شراء متابعين تويتر, شراء متابعين فيس بوك, زيادة مشتركين يوتيوب, زيادة مشاهدات يوتيوب, زيادة متابعين تيك توك, توثيق حسابات انستقرام, زيادة متابعين سناب شات, زيادة 4000 ساعة مشاهدة, زيادة لايكات فيسبوك, smm panel, SmartPanel, smm reseller panel, smm provider panel, reseller panel, instagram panel, تسويق الكتروني, تسويق فيسبوك, تسويق انستقرام, متابعين, مشتركين, مشاهدات, تفاعلات, تحقيق الربح, تفعيل الربح, دعم فني, توثيق, حسابات, تعليقات, اعضاء, فيسبوك, تويتر, انستجرام, تلجرام, يوتيوب, لينكدإن, ساوند كلاود, سناب شات, واتساب, تيك توك, سبوتيفاي, سيو, تقييم, تنزيل تطبيقات, تزويد متابعين, مشاهدات يوتيوب حقيقية, مشتركين يوتيوب حقيقية, متابعين سناب شات, زيارات للمواقع, متابعين فيسبوك, متابعين تويتر, متابعين تلجرام, متابعين انستجرام, متابعين تيك توك, متابعين سبوتيفاي, تحقيق شروط يوتيوب 4000 ساعة 1000 مشترك, ارخص واسرع سيرفر زيادة متابعين, سيرفر بيع وزيادة متابعين, متجر بيع متابعين, Followers, Subscribers, Views, Likes, Comments, SMM Panel, Social Media Marketing, Instagram followers, TikTok followers, YouTube views, Facebook likes, Twitter followers, Snapchat followers, Spotify followers, Telegram members, SEO optimization, Buy followers, Increase followers, cheapest SMM panel",
  openGraph: {
    title: "Growence Media | أفضل سيرفر زيادة متابعين",
    description: "أفضل وارخص سيرفر بيع وزيادة متابعين بالشرق الأوسط — متابعين، لايكات، مشاهدات لجميع المنصات",
    type: "website",
    locale: "ar_SA",
    siteName: "Growence Media",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-dark-900 text-gray-200 font-arabic min-h-screen">
        <Toaster
          position="top-center"
          toastOptions={{
            className: "toast-custom",
            duration: 3000,
          }}
        />
        {children}
      </body>
    </html>
  );
}
