// frontend/components/layout/PublicHeader.tsx
'use client';

// 1. Добавляем необходимые импорты
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, User, ChevronDown, LogIn, LogOut, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PublicHeader() {
  // 2. Инициализируем хуки
  const router = useRouter();
  const { user, login, logout } = useAuth();

  // 3. Создаем состояние для хранения текста из поля поиска
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Создаем функцию-обработчик для поиска
  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Реагируем только на нажатие Enter и если запрос не пустой
    if (event.key === 'Enter' && searchQuery.trim() !== '') {
      // Перенаправляем пользователя на главную страницу с поисковым запросом в URL
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMyBookings = () => {
    // ... (ваша логика для кнопки "Мои брони")
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-md py-3">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        {/* 1. Логотип */}
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-foreground">
          <span className="text-3xl">🍽️</span>
          <span className="hidden md:inline">Orynbar</span>
        </Link>

        {/* 2. Поиск (с добавленной логикой) */}
        <div className="flex-grow max-w-xl flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ресторан, кухня или блюдо..."
              className="w-full pl-10 pr-4 py-2 h-12 border-2 border-input rounded-full focus:ring-2 focus:ring-ring focus:border-primary"
              
              // 5. Привязываем поле ввода к состоянию и обработчику
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        {/* 3. Навигация и профиль */}
        <nav className="flex items-center gap-2">
          <Button variant="ghost" className="hidden md:flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Алматы</span>
          </Button>

          <Button variant="ghost" onClick={handleMyBookings}>
            <BookOpen className="h-5 w-5" />
            <span className="hidden lg:inline ml-2 font-medium">Мои брони</span>
          </Button>

          {/* Профиль или кнопка входа */}
          {user ? (
            // --- Состояние: Пользователь в системе ---
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
                
                {/* Показываем ссылку на админку, если роль подходящая */}
                {(user.role === 'admin' || user.role === 'restaurant_owner') && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Админ-панель</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // --- Состояние: Пользователь НЕ в системе ---
            <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/auth/login">
                <LogIn className="h-5 w-5" />
                <span className="hidden lg:inline ml-2 font-medium">Войти</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
