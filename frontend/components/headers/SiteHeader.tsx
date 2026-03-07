// frontend/components/headers/SiteHeader.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AdminHeader } from './admin-header'; // Этот импорт можно даже убрать
import { PublicHeader } from './public-header';

export function SiteHeader() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin');

  // ЕСЛИ мы находимся в админ-разделе, этот компонент не должен ничего рендерить.
  // За шапку админки отвечает AdminLayout.
  if (isAdminPath) {
    return null;
  }

  // Во всех остальных случаях показываем публичную шапку.
  return <PublicHeader />;
}
