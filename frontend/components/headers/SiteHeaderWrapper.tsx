'use client';

import { useAuth } from '@/app/context/AuthContext';
import { usePathname } from 'next/navigation';
import { SiteHeader } from './SiteHeader';

export function SiteHeaderWrapper() {
  const { isLoading } = useAuth();
  const pathname = usePathname();
  
  // Не показываем хэдер, пока идет загрузка
  if (isLoading) {
    return null;
  }
  
  // Скрываем хэдер на страницах партнера и админа
  if (pathname?.startsWith('/partner') || pathname?.startsWith('/admin')) {
    return null;
  }
  
  return <SiteHeader />;
}
