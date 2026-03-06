// frontend/app/(public)/admin/layout.tsx

import { AdminHeader } from "@/components/headers/admin-header";
import ProtectedAdminRoute from "@/components/auth/ProtectedAdminRoute"; // 1. Импортируем

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 2. Оборачиваем все в наш компонент-охранник
    <ProtectedAdminRoute>
      <div className="flex flex-col min-h-screen">
        <AdminHeader />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
