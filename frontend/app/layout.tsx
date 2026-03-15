import type { Metadata } from "next";
import "./globals.css";
import { SiteHeaderWrapper } from "@/components/headers/SiteHeaderWrapper";
import { Footer } from "@/components/footer/footer_component";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Orynbar",
  description: "Restaurant booking platform with dynamic discounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
