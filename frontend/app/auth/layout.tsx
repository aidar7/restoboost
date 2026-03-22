import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthHeader } from "@/components/headers/auth-header";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Orynbar - Вход",
  description: "Вход в аккаунт Orynbar",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <AuthHeader />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
