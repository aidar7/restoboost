'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, Utensils, ArrowLeft, BookOpen, Camera  } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const handleMyBookings = () => {
    const phone = prompt('Введите ваш номер телефона:\n(например: +77771234567)');
    if (!phone?.trim()) return;
    router.push(`/my-bookings?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🍽️</span>
            <span>DamBook</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {/* ПУБЛИЧНАЯ ЧАСТЬ */}
            {!isAdmin && (
              <>
                <Button variant="ghost" size="sm" onClick={handleMyBookings}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Мои брони
                </Button>
                <div className="w-px h-6 bg-border" />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/dashboard">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">
                    <Utensils className="mr-2 h-4 w-4" />
                    Админ
                  </Link>
                </Button>
              </>
            )}

            {/* АДМИН ЧАСТЬ */}
            {isAdmin && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/dashboard">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Дашборд
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/scan">
                    <Camera className="mr-2 h-4 w-4" />
                    Сканировать
                  </Link>
                </Button>

                <div className="w-px h-6 bg-border" />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Главная
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
