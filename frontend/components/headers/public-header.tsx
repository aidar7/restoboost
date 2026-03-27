// frontend/components/headers/public-header.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, User, LogIn, LogOut, LayoutDashboard, BookOpen, X } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  // Инициализируем поле из URL-параметра (если пришли со страницы с поиском)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизируем поле с URL при навигации
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const doSearch = (query: string) => {
    const q = query.trim();
    if (q) {
      router.push(`/?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      doSearch(searchQuery);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    router.push('/');
    inputRef.current?.focus();
  };

  const handleMyBookings = () => {
    router.push('/customer/bookings');
  };

  const handleLogout = async () => {
    logout();
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur">
      <div className="container mx-auto px-4 border-b">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-foreground flex-shrink-0">
            <span className="text-3xl">🍽️</span>
            <span className="hidden md:inline">Orynbar</span>
          </Link>

          {/* Поиск */}
          <div className="flex-grow max-w-xl flex items-center">
            <div className="relative w-full">
              {/* Иконка поиска — кликабельная */}
              <button
                type="button"
                onClick={() => doSearch(searchQuery)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Найти"
              >
                <Search className="h-5 w-5" />
              </button>

              <Input
                ref={inputRef}
                type="text"
                placeholder="Ресторан, кухня или блюдо..."
                className="w-full pl-10 pr-10 py-2 h-12 border-2 border-input rounded-full focus:ring-2 focus:ring-ring focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              {/* Кнопка очистки — появляется только когда есть текст */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Навигация */}
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
                    <Link href="/customer/bookings">
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
