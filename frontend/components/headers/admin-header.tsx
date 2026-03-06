// components/layout/AdminHeader.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, Utensils, Camera, ArrowLeft } from 'lucide-react';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🛠️</span>
            <span>Keshme (Админ)</span>
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
