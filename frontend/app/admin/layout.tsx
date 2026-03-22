import type { Metadata } from "next";
import "@/app/globals.css";
import { AdminHeader } from "@/components/headers/admin-header";
import ProtectedAdminRoute from "@/components/auth/ProtectedAdminRoute";

export const metadata: Metadata = {
  title: "Orynbar Admin - Администрирование",
  description: "Панель администратора",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedAdminRoute>
      <div className="flex flex-col min-h-screen">
        <AdminHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
