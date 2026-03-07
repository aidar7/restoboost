// frontend/components/headers/admin-header.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, Utensils, Camera, ArrowLeft } from 'lucide-react';

export function AdminHeader() {
  return (
    // 1. Убираем границу с внешнего контейнера
    <header className="sticky top-0 z-50 bg-background">
      
      {/* 2. Добавляем границу на внутренний контейнер, чтобы она не была на всю ширину */}
      <div className="container mx-auto px-4 border-b">
        
        {/* 3. Убираем фиксированную высоту h-16 и добавляем вертикальный отступ py-3, чтобы сделать хэдер выше */}
        <div className="flex items-center justify-between py-3">
          
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🛠️</span>
            <span>Orynbar(Админ)</span>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/dashboard"><BarChart3 className="mr-2 h-4 w-4" />Дашборд</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin"><Utensils className="mr-2 h-4 w-4" />Рестораны</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/scan"><Camera className="mr-2 h-4 w-4" />Сканировать</Link>
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />На сайт</Link>
            </Button>
          </nav>

        </div>
      </div>
    </header>
  );
}
