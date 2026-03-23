import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthHeader } from "@/components/headers/auth-header";

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
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
