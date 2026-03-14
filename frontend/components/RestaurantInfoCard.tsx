// components/RestaurantInfoCard.tsx
'use client';

import React from 'react';
import {
  Building2,
  UtensilsCrossed,
  DollarSign,
  MapPin,
  Phone,
  Star,
  Leaf,
  Users,
  Wine,
} from 'lucide-react';

interface RestaurantInfoCardProps {
  restaurant: {
    id?: number;
    name?: string;
    category?: string;
    cuisine?: string[];
    avg_check?: number;
    address?: string;
    phone?: string;
    rating?: number;
    features?: string[];
    description?: string;
  };
}

// Маппинг категорий на иконки и названия
const getCategoryInfo = (category?: string) => {
  const categoryMap: Record<string, { icon: React.ReactNode; label: string }> = {
    restaurant: { icon: <Building2 className="w-4 h-4" />, label: 'Ресторан' },
    cafe: { icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Кафе' },
    bar: { icon: <Wine className="w-4 h-4" />, label: 'Бар' },
    fast_food: { icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Фаст-фуд' },
  };
  return categoryMap[category?.toLowerCase() || 'restaurant'] || 
    { icon: <Building2 className="w-4 h-4" />, label: 'Ресторан' };
};

// Маппинг особенностей на иконки
const getFeatureIcon = (feature?: string) => {
  const featureMap: Record<string, React.ReactNode> = {
    'в центре': <MapPin className="w-4 h-4" />,
    'летняя терраса': <Leaf className="w-4 h-4" />,
    'семейный': <Users className="w-4 h-4" />,
    'вип-залы': <Building2 className="w-4 h-4" />,
    'доставка': <UtensilsCrossed className="w-4 h-4" />,
  };
  
  const lowerFeature = feature?.toLowerCase() || '';
  for (const [key, icon] of Object.entries(featureMap)) {
    if (lowerFeature.includes(key)) return icon;
  }
  return <MapPin className="w-4 h-4" />;
};

export function RestaurantInfoCard({ restaurant }: RestaurantInfoCardProps) {
  const categoryInfo = getCategoryInfo(restaurant.category);

  return (
    <div className="space-y-4">
      {/* Первая строка: Тип заведения + Кухня */}
      <div className="flex flex-wrap gap-2">
        {/* Тип заведения */}
        {restaurant.category && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors">
            <span className="text-muted-foreground">{categoryInfo.icon}</span>
            <span className="text-sm font-medium">{categoryInfo.label}</span>
          </div>
        )}

        {/* Кухня */}
        {restaurant.cuisine && restaurant.cuisine.length > 0 && (
          restaurant.cuisine.map((c, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors"
            >
              <span className="text-muted-foreground">
                <UtensilsCrossed className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">{c}</span>
            </div>
          ))
        )}
        {/* Средний чек */}
        {restaurant.avg_check && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors">
            <span className="text-muted-foreground">
              <DollarSign className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium">Средний чек {restaurant.avg_check} ₸</span>
          </div>
        )}
      </div>

      {/* Вторая строка: Средний чек + Рейтинг + Адрес */}
      <div className="flex flex-wrap gap-2">

        {/* Рейтинг */}
        {restaurant.rating && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors">
            <span className="text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
            </span>
            <span className="text-sm font-medium">{restaurant.rating.toFixed(1)}</span>
          </div>
        )}
         {/* Особенности */}
        {restaurant.features && restaurant.features.length > 0 && (
          restaurant.features.map((feature, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors"
            >
              <span className="text-muted-foreground">
                {getFeatureIcon(feature)}
              </span>
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}