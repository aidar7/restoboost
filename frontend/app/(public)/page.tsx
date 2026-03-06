'use client';

import { Suspense } from 'react';
import HomeContent from '@/components/HomeContent';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="text-lg text-muted-foreground">Загрузка...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
