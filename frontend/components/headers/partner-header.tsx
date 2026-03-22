// frontend/components/headers/partner-header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3, Utensils, Settings, LogOut, User, Camera } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PartnerHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/partner/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-green-50 border-b border-green-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          
          <Link href="/partner/dashboard" className="flex items-center gap-2 font-bold text-xl text-green-700">
            <span className="text-2xl">🏢</span>
            <span>Orynbar для партнёров</span>
          </Link>
          
          <nav className="flex items-center gap-2">
            
            <Button variant="ghost" size="sm" asChild className="text-green-700 hover:bg-green-100">
              <Link href="/partner/dashboard">
                <BarChart3 className="mr-2 h-4 w-4" />
                Дашборд
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="text-green-700 hover:bg-green-100">
              <Link href="/partner/restaurant">
                <Utensils className="mr-2 h-4 w-4" />
                Мой ресторан
              </Link>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              asChild 
              className="text-green-700 hover:bg-green-100 font-semibold"
            >
              <Link href="/partner/scan">
                <Camera className="mr-2 h-4 w-4" />
                Сканировать
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="text-green-700 hover:bg-green-100">
              <Link href="/partner/settings">
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Link>
            </Button>

            <div className="w-px h-6 bg-green-200" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full border-green-300 text-green-700 hover:bg-green-100">
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
                  <Link href="/partner/settings">
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
