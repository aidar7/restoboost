// frontend/components/PageHeader.tsx
'use client';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { MapPin, UtensilsCrossed, Star } from 'lucide-react';

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
    <>
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>

      {/* Address - с иконкой */}
      {address && (
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <MapPin className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{address}</span>
        </div>
      )}

      {/* Cuisine & Avg Check - с иконкой */}
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        <UtensilsCrossed className="w-5 h-5 flex-shrink-0" />
        <div className="text-sm text-gray-700 flex flex-wrap gap-1">
          {cuisine && cuisine.length > 0 && (
            <span>{cuisine.slice(0, 2).join(' • ')}</span>
          )}
          {cuisine && cuisine.length > 0 && avgCheck && (
            <span>•</span>
          )}
          {avgCheck && (
            <span>Средний чек {avgCheck}₸</span>
          )}
        </div>
      </div>

      {/* Rating - с иконкой */}
      {rating && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-0.5 flex-shrink-0">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
        </div>
      )}

      {/* Main content */}
      {children}
    </>
  );
}
