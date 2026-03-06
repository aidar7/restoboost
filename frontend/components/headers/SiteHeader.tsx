// frontend/components/layout/SiteHeader.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AdminHeader } from './admin-header';
import { PublicHeader } from './public-header';

export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <AdminHeader />;
  }

  return <PublicHeader />;
}
