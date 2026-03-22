import type { Metadata } from "next";
import "@/app/globals.css";
import { SiteHeaderWrapper } from "@/components/headers/SiteHeaderWrapper";
import { Footer } from "@/components/footer/footer_component";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Orynbar - Бронирование ресторанов",
  description: "Найдите и забронируйте лучшие рестораны",
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <SiteHeaderWrapper />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
