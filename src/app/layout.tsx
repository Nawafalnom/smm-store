import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Growence Media | لوحة خدمات التسويق الإلكتروني",
  description: "جروينس ميديا — أفضل خدمات التسويق الإلكتروني: متابعين، لايكات، مشاهدات لجميع المنصات",
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
