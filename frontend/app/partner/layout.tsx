import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthHeaderPartner } from "@/components/headers/auth-header-partner";
import { PartnerHeader } from "@/components/headers/partner-header";

export const metadata: Metadata = {
  title: "Orynbar Partner - Управление рестораном",
  description: "Панель управления для партнеров",
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PartnerHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
