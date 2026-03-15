// frontend/components/headers/SiteHeaderWrapper.tsx
'use client';

import { useAuth } from '@/app/context/AuthContext';
import { SiteHeader } from './SiteHeader';

export function SiteHeaderWrapper() {
  const { isLoading } = useAuth();
  
  // Не показываем хэдер, пока идет загрузка
  if (isLoading) {
    return null;
  }
  
  return <SiteHeader />;
}
