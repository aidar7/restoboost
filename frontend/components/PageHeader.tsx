// frontend/components/PageHeader.tsx
'use client';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
  rating?: number;
  address?: string;
  avgCheck?: number;
  cuisine?: string[];
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  breadcrumbs,
  rating,
  address,
  avgCheck,
  cuisine,
  children,
}: PageHeaderProps) {
  return (
    // 1. Убираем все обертки (min-h-screen, bg-background, sticky). 
    // Компонент теперь просто блок.
    <>
      {/* Блок с хлебными крошками и заголовком */}
      <div className="mb-6"> { /* Добавляем отступ снизу */ }
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>

        {/* Вся дополнительная информация (рейтинг, адрес и т.д.) */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {rating && (
            <Badge variant="secondary" className="text-base py-1 px-3">
              ★ {rating}
            </Badge>
          )}
          {address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>{address}</span>
            </div>
          )}
          {avgCheck && (
            <div className="text-muted-foreground">💰 От {avgCheck} ₸</div>
          )}
        </div>

        {cuisine && cuisine.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {cuisine.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* 2. Основной контент страницы рендерится сразу после заголовка */}
      {children}
    </>
  );
}
