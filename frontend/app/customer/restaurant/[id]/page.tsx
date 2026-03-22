'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/config';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { RestaurantInfoCard } from '@/components/RestaurantInfoCard';
import { BookingForm } from '@/components/BookingForm';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string;
  cuisine: string[];
  rating?: number;
  avg_check: number;
  description?: string;
  photos: string[];
}

type TabValue = 'main' | 'reviews';

function Lightbox({
  open, photos, currentPhotoIndex, onClose, onPrev, onNext,
}: {
  open: boolean;
  photos: string[];
  currentPhotoIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white" type="button">
        <X className="w-8 h-8" />
      </button>
      <img
        src={photos[currentPhotoIndex]}
        alt="Full size"
        className="max-w-5xl max-h-[90vh] object-contain"
        loading="lazy"
      />
      <button onClick={onPrev} className="absolute left-4 text-white" type="button">
        <ChevronLeft className="w-9 h-9" />
      </button>
      <button onClick={onNext} className="absolute right-4 text-white" type="button">
        <ChevronRight className="w-9 h-9" />
      </button>
    </div>
  );
}

const HeroGallery = React.memo(({
  photos, onOpen,
}: {
  photos: string[];
  onOpen: (index: number) => void;
  onPick: (index: number) => void;
}) => {
  if (!photos?.length) return null;
  const main = photos[0];
  const rest = photos.slice(1, 5);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="md:col-span-2 rounded-xl overflow-hidden border border-border bg-card"
      >
        <img src={main} alt="" className="h-72 md:h-80 w-full object-cover" loading="lazy" />
      </button>
      <div className="md:col-span-2 grid grid-cols-2 gap-3">
        {rest.map((p, idx) => (
          <button
            key={`photo-${idx}`}
            type="button"
            onClick={() => onOpen(idx + 1)}
            className="rounded-xl overflow-hidden border border-border bg-card"
          >
            <img src={p} alt="" className="h-36 md:h-[156px] w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
});

HeroGallery.displayName = 'HeroGallery';

export default function RestaurantDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const restaurantId = params?.id;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('main');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const controller = new AbortController();
    const load = async () => {
      const cacheKey = `restaurant_${restaurantId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setRestaurant(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) { }
      }
      setRestaurant(null);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Ошибка сети: ${res.status}`);
        const data = await res.json();
        setRestaurant(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setLoading(false);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError('Не удалось загрузить данные ресторана.');
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [restaurantId]);

  const openLightbox = useCallback((index: number) => {
    setCurrentPhotoIndex(index);
    setShowLightbox(true);
  }, []);

  if (loading || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-xl font-bold">Ошибка</h2>
          </div>
          <p>{error}</p>
          <Button className="mt-4 w-full" onClick={() => router.push('/')}>Главная</Button>
        </Card>
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Ресторан не найден</h2>
          <Button className="mt-4 w-full" onClick={() => router.push('/')}>Главная</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title={restaurant.name}
        breadcrumbs={[{ label: 'Рестораны', href: '/' }, { label: restaurant.name }]}
        rating={restaurant.rating}
        address={restaurant.address}
        avgCheck={restaurant.avg_check}
        cuisine={restaurant.cuisine}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">

        {/* Левая колонка — контент (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <HeroGallery
            photos={restaurant.photos}
            onOpen={openLightbox}
            onPick={(i) => setCurrentPhotoIndex(i)}
          />

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="main">О ресторане</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold mb-4">Информация</h2>
                  <RestaurantInfoCard restaurant={restaurant} />
                </div>
                {restaurant.description && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-4">О ресторане</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {restaurant.description}
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">Отзывы</h2>
                <p className="text-muted-foreground">Здесь будут отзывы посетителей.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Правая колонка — форма бронирования (1/3) */}
        <div className="lg:col-span-1">
          {restaurantId && (
            <BookingForm
              restaurantId={restaurantId}
              restaurantName={restaurant.name}
            />
            )}
        </div>

      </div>

      <Lightbox
        open={showLightbox}
        photos={restaurant.photos}
        currentPhotoIndex={currentPhotoIndex}
        onClose={() => setShowLightbox(false)}
        onPrev={() => setCurrentPhotoIndex((p) => (p - 1 + restaurant.photos.length) % restaurant.photos.length)}
        onNext={() => setCurrentPhotoIndex((p) => (p + 1) % restaurant.photos.length)}
      />
    </div>
  );
}