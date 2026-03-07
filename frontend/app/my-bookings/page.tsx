// frontend/app/my-bookings/page.tsx
'use client';

import { PageHeader } from '@/components/PageHeader';

export default function MyBookingsPage() {
  return (
    // 1. Добавляем контейнер, чтобы страница выглядела так же, как страница ресторана
    <div className="max-w-6xl mx-auto px-4 py-6">
      
      {/* 2. Используем наш стандартизированный PageHeader */}
      <PageHeader
        title="Мои бронирования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Мои бронирования' },
        ]}
      >
        {/* 3. Вставляем заглушку для будущего контента */}
        <div className="mt-8 text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
          <p className="text-lg font-medium">Эта страница в разработке</p>
          <p>Здесь будет отображаться список ваших активных и прошедших бронирований.</p>
        </div>
      </PageHeader>

    </div>
  );
}