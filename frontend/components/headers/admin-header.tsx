// frontend/components/headers/admin-header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3, Utensils, Camera, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="container mx-auto px-4 border-b">
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
            
            {/* DROPDOWN МЕНЮ АККАУНТА */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline ml-2 font-medium">
                    {user?.full_name || 'Профиль'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Настройки профиля</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
