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
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* HERO */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>

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
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* CHILDREN (фото, контент и т.д.) */}
        {children}
      </div>
    </div>
  );
}
