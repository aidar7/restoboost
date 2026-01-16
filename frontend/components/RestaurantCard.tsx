'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  // Get first 5 timeslots to display
  const displayedTimeslots = restaurant.timeslots?.slice(0, 5) || [];

  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full flex flex-col">
        
        {/* Image Carousel Section */}
        <div className="relative h-56 bg-gray-200 overflow-hidden group">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={restaurant.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
              <span className="text-5xl mb-2">{getCategoryIcon(restaurant.category)}</span>
              <span className="text-xs text-gray-500 text-center px-4">{restaurant.name}</span>
            </div>
          )}

          {/* Rating Badge - Top Right */}
          {restaurant.rating > 0 && (
            <div className="absolute top-3 right-3 bg-white rounded-lg shadow-lg p-2 flex flex-col items-center min-w-[60px]">
              <span className="text-2xl font-bold text-gray-900">{restaurant.rating.toFixed(1)}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < Math.round(restaurant.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              {restaurant.timeslots && restaurant.timeslots.length > 0 && (
                <span className="text-xs text-gray-600 mt-1">({restaurant.timeslots.length})</span>
              )}
            </div>
          )}

          {/* Favorite Button - Top Left */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 left-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          >
            <Heart
              size={20}
              className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
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

          {/* Insider Badge */}
          <Badge className="absolute top-3 right-3 bottom-auto left-3 w-fit bg-gray-600 text-white border-0 text-xs">
            Новый
          </Badge>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-4 space-y-3">
          
          {/* Restaurant Name */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
              {restaurant.name}
            </h3>
          </div>

          {/* Address */}
          {restaurant.address && (
            <p className="text-sm text-gray-600 line-clamp-1">
              📍 {restaurant.address}
            </p>
          )}

          {/* Cuisine & Avg Price */}
          <div className="text-sm text-gray-700">
            {restaurant.cuisine?.length > 0 && (
              <span>{restaurant.cuisine.slice(0, 2).join(' • ')}</span>
            )}
            {restaurant.avg_check && (
              <span className="ml-2">• Средний чек {restaurant.avg_check}₸</span>
            )}
          </div>

          {/* Discount Badge
          {maxDiscount > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-900 text-white text-sm font-semibold px-3 py-1">
                Up to -{maxDiscount}%
              </Badge>
              {restaurant.popularity && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  🍽️ Yums x{restaurant.popularity}
                </Badge>
              )}
            </div>
          )} */}

          {/* Available Timeslots
          {displayedTimeslots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold">Available times:</p>
              <div className="flex flex-wrap gap-2">
                {displayedTimeslots.map((slot, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <Badge className="bg-teal-700 text-white text-xs font-semibold px-2 py-1">
                      {slot.time}
                    </Badge>
                    <span className="text-xs text-gray-600 font-semibold mt-0.5">
                      -{slot.discount}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {/* Book Button */}
          <button className="w-full mt-auto bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Забронировать 
          </button>
        </div>
      </div>
    </Link>
  );
}
