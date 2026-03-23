// frontend/components/headers/public-header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, User, LogIn, LogOut, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PublicHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim() !== '') {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMyBookings = () => {
    router.push('/my-bookings');
  };

  // Новая функция для выхода с редиректом
  const handleLogout = async () => {
    logout();
    // Небольшая задержка для анимации
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/');
  };

  return (
    // 1. Убираем тень (shadow-md) и добавляем полупрозрачность (bg-background/90 backdrop-blur)
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur">
      {/* 2. Добавляем границу (border-b) на внутренний контейнер */}
      <div className="container mx-auto px-4 border-b">
        {/* 3. Убираем py-3 и возвращаем h-16 для стандартной высоты хэдера */}
        <div className="flex h-16 items-center justify-between gap-4">
          
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-foreground">
            <span className="text-3xl">🍽️</span>
            <span className="hidden md:inline">Orynbar</span>
          </Link>

          <div className="flex-grow max-w-xl flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ресторан, кухня или блюдо..."
                className="w-full pl-10 pr-4 py-2 h-12 border-2 border-input rounded-full focus:ring-2 focus:ring-ring focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="hidden md:flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Алматы</span>
            </Button>

            <Button variant="ghost" onClick={handleMyBookings}>
              <BookOpen className="h-5 w-5" />
              <span className="hidden lg:inline ml-2 font-medium">Мои брони</span>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="hidden lg:inline ml-2 font-medium">
                      {user.full_name || 'Профиль'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-bookings">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Мои брони</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  {(user.role === 'admin' || user.role === 'restaurant_owner') && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Админ-панель</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/login">
                  <LogIn className="h-5 w-5" />
                  <span className="hidden lg:inline ml-2 font-medium">Войти</span>
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
