// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";

// 1. Импортируем наш новый "умный" хэдер
import { SiteHeader } from "@/components/headers/SiteHeader"; 

export const metadata: Metadata = {
  title: "RestoBoost",
  description: "Restaurant booking platform with dynamic discounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          {/* 2. Вставляем хэдер сюда, внутри AuthProvider */}
          <SiteHeader />
          
          {/* 3. Оборачиваем основной контент в <main> для семантики */}
          <main className="flex-1">
            {children}
          </main>
          
        </AuthProvider>
      </body>
    </html>
  );
}
