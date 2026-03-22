// frontend/components/headers/SiteHeader.tsx
'use client';

import { usePathname } from 'next/navigation';
import { PublicHeader } from './public-header';

export function SiteHeader() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin');
  const isPartnerPath = pathname.startsWith('/partner');

  // Скрываем хэдер на админ и партнер страницах
  if (isAdminPath || isPartnerPath) {
    return null;
  }

  // Во всех остальных случаях показываем публичную шапку
  return <PublicHeader />;
}
