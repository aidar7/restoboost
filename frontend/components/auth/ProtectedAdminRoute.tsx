// frontend/app/components/auth/ProtectedAdminRoute.tsx

'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Этот компонент будет "оберткой" для страниц, требующих прав администратора

export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если загрузка еще идет, ничего не делаем, ждем результат проверки
    if (isLoading) {
      return;
    }

    // Если пользователь не аутентифицирован, отправляем его на страницу входа
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Если пользователь аутентифицирован, но его роль не подходит, отправляем на главную
    if (user && user.role !== 'admin' && user.role !== 'restaurant_owner') {
      console.warn(`Access Denied: User with role '${user.role}' tried to access an admin route.`);
      router.push('/'); // Перенаправляем на главную
    }

  }, [isLoading, isAuthenticated, user, router]);


  // --- Что показывать на экране, пока идут проверки ---

  // 1. Пока идет проверка токена, показываем глобальный загрузчик
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 2. Если пользователь прошел все проверки (залогинен и имеет нужную роль),
  // показываем ему запрошенную страницу (например, дашборд админки).
  if (isAuthenticated && user && (user.role === 'admin' || user.role === 'restaurant_owner')) {
    return <>{children}</>;
  }

  // 3. Во всех остальных случаях (например, в момент редиректа)
  // показываем пустой экран или еще один загрузчик, чтобы избежать "мелькания" контента.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <p>Проверка доступа...</p>
    </div>
  );
}
