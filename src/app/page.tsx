"use client";

import Link from "next/link";
import { BRANDS } from "@/lib/supabase";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 bg-grid">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial opacity-50" style={{ "--brand-rgb": "100, 100, 255" } as any} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-5xl md:text-7xl font-900 mb-6 bg-gradient-to-l from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-slide-up">
            خدمات التسويق الرقمي
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-4 animate-slide-up delay-2 opacity-0">
            متابعين • لايكات • مشاهدات • تعليقات • مشتركين
          </p>
          <p className="text-lg text-gray-500 animate-slide-up delay-3 opacity-0">
            لجميع المنصات: فيسبوك، انستجرام، تيك توك، يوتيوب، تويتر والمزيد
          </p>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20 -mt-4">
        <h2 className="text-2xl font-display font-bold text-center mb-12 text-gray-300">
          اختر العلامة التجارية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANDS.map((brand, i) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className="group block animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.12}s`, "--brand-color": brand.color, "--brand-rgb": brand.colorRgb } as any}
            >
              <div className="card-dark p-8 h-full flex flex-col items-center text-center">
                {/* Brand Icon */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 animate-float"
                  style={{
                    background: `linear-gradient(135deg, ${brand.color}22, ${brand.color}08)`,
                    border: `2px solid ${brand.color}44`,
                  }}
                >
                  <span className="text-3xl font-display font-900" style={{ color: brand.color }}>
                    {brand.name.charAt(0)}
                  </span>
                </div>

                {/* Name */}
                <h3
                  className="font-display text-2xl font-800 mb-1"
                  style={{ color: brand.color }}
                >
                  {brand.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4 font-bold">{brand.nameAr}</p>

                {/* Description */}
                <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                  {brand.description}
                </p>

                {/* CTA */}
                <div
                  className="w-full py-3 rounded-xl text-center font-bold transition-all duration-300 group-hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${brand.color}20, ${brand.color}08)`,
                    border: `1px solid ${brand.color}40`,
                    color: brand.color,
                  }}
                >
                  تصفّح الباقات ←
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 text-center text-gray-600 text-sm">
        <p>جميع الحقوق محفوظة © {new Date().getFullYear()} - خدمات التسويق الرقمي</p>
      </footer>
    </div>
  );
}
