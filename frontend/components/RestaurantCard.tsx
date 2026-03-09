'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BadgeType, getBadgeConfig } from './badge-config';

interface Restaurant {
  id: number;
  name: string;
  category: string;
  rating: number;
  avg_check: number;
  address: string;
  photos: string[];
  cuisine: string[];
  timeslots?: Array<{ time: string; discount: number }>;
  popularity?: number;
  badgeType?: BadgeType;
}


interface RestaurantCardProps {
  restaurant: Restaurant;
  getCategoryIcon: (cat: string) => string;
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  street_food: '🌮',
  bar: '🍺',
  bakery: '🥐',
};

export default function RestaurantCard({ restaurant, getCategoryIcon }: RestaurantCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const currentPhoto = restaurant.photos?.[currentPhotoIndex];
  const maxDiscount = useMemo(() => {
    if (!restaurant.timeslots || restaurant.timeslots.length === 0) return 0;
    return Math.max(...restaurant.timeslots.map((t) => t.discount));
  }, [restaurant.timeslots]);

  const nextPhoto = () => {
    if (restaurant.photos?.length) {
      setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.photos.length);
    }
  };

  const prevPhoto = () => {
    if (restaurant.photos?.length) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? restaurant.photos.length - 1 : prev - 1
      );
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFavorite(!isFavorite);
  };

  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <div className="bg-card/80 backdrop-blur-sm rounded-xl overflow-hidden border border-border/50 hover:border-border/70 transition-colors duration-300 cursor-pointer h-full flex flex-col">
  
        {/* Image Carousel Section */}
        <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-50 overflow-hidden group">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={restaurant.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
              <span className="text-5xl mb-2">{getCategoryIcon(restaurant.category)}</span>
              <span className="text-xs text-muted-foreground text-center px-4">{restaurant.name}</span>
            </div>
          )}

          {/* Badge "Новый" - Top Left */}
          {restaurant.badgeType && (
            <Badge className={`absolute top-3 left-3 ${getBadgeConfig(restaurant.badgeType).bgColor} ${getBadgeConfig(restaurant.badgeType).textColor} border-0 text-xs`}>
              {getBadgeConfig(restaurant.badgeType).label}
            </Badge>
          )}

          {/* Favorite Button - Top Right */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-gray-50/80 transition-colors border border-border/50"
          >
            <Heart
              size={20}
              className={isFavorite ? 'fill-error text-error' : 'text-muted-foreground'}
            />
          </button>

          {/* Photo Counter */}
          {restaurant.photos && restaurant.photos.length > 1 && (
            <>
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                {restaurant.photos.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50 w-1.5'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  prevPhoto();
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  nextPhoto();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-4">
          {/* Restaurant Name */}
<h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2">
  {restaurant.name}
</h3>

{/* Address */}
{restaurant.address && (
  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
    📍 {restaurant.address}
  </p>
)}


{/* Cuisine & Avg Price */}
<div className="text-sm text-foreground flex flex-wrap gap-1 mb-2">
  {restaurant.cuisine?.length > 0 && (
    <span>{restaurant.cuisine.slice(0, 2).join(' • ')}</span>
  )}
  {restaurant.cuisine?.length > 0 && restaurant.avg_check && (
    <span>•</span>
  )}
  {restaurant.avg_check && (
    <span>Средний чек {restaurant.avg_check}₸</span>
  )}
</div>

{/* Rating */}
{restaurant.rating > 0 && (
  <div className="flex items-center gap-2 mb-2">
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(restaurant.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
        />
      ))}
    </div>
    <span className="font-semibold text-foreground text-sm">{restaurant.rating.toFixed(1)}</span>
  </div>
)}

{/* Discount Badge */}
{maxDiscount > 0 && (
  <div className="flex items-center gap-2 mb-3">
    <Badge className="bg-foreground text-background text-sm font-semibold px-3 py-1">
      До -{maxDiscount}%
    </Badge>
    {restaurant.popularity && (
      <Badge className="bg-warning-light text-warning text-xs">
        🍽️ Популярно x{restaurant.popularity}
      </Badge>
    )}
  </div>
)}


          {/* Book Button */}
          <button className="w-full mt-auto bg-booking hover:bg-booking-hover text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
            Забронировать 
          </button>

        </div>
      </div>
    </Link>
  );
}
