'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { API_URL, API_BASE } from '@/lib/config';
import { PublicHeader } from '@/components/headers/public-header';
import React, { ReactNode } from 'react';

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


const CATEGORIES = [
  { id: 'all', name: 'Все' },
  { id: 'restaurant', name: 'Рестораны' },
  { id: 'cafe', name: 'Кофе' },
  { id: 'street_food', name: 'Street Food' },
  { id: 'bar', name: 'Бары' },
  { id: 'bakery', name: 'Пекарни' },
];

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  street_food: '🌮',
  bar: '🍺',
  bakery: '🥐',
};




export default function Home() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (category === 'all') return 'Все рестораны';
    if (category === 'restaurant') return 'Рестораны';
    if (category === 'cafe') return 'Кофе';
    if (category === 'street_food') return 'Street Food';
    if (category === 'bar') return 'Бары';
    if (category === 'bakery') return 'Пекарни';
    return 'Рестораны';
  }, [category]);



  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || '🍽️';

  // const getMaxDiscount = (timeslots?: Array<{ discount: number }>) => {
  //   if (!timeslots || timeslots.length === 0) return 0;
  //   return Math.max(...timeslots.map((t) => t.discount));
  // };

  useEffect(() => {
    const controller = new AbortController();

    const fetchRestaurants = async () => {
      try {
        setLoading(true);

        const url =
          category === 'all'
            ? `${API_BASE}/restaurants`
            : `${API_BASE}/restaurants?category=${encodeURIComponent(category)}`;

        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch');

        const data = (await res.json()) as Restaurant[];
        setRestaurants(data);
        setError('');
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError('Ошибка при загрузке ресторанов');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();

    return () => controller.abort();
  }, [category]);

  const handleMyBookings = () => {
    const phone = prompt('Введите ваш номер телефона:\n(например: +77771234567)');
    if (!phone?.trim()) return;

    router.push(`/my-bookings?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <main className="container mx-auto px-4 py-8">

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                variant={category === cat.id ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Filters (пока без логики) */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔍 Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Скидка</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Все скидки" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все скидки</SelectItem>
                      <SelectItem value="10">От 10%</SelectItem>
                      <SelectItem value="20">От 20%</SelectItem>
                      <SelectItem value="30">От 30%</SelectItem>
                      <SelectItem value="40">От 40%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Кухня</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Любая кухня" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любая кухня</SelectItem>
                      <SelectItem value="european">Европейская</SelectItem>
                      <SelectItem value="asian">Азиатская</SelectItem>
                      <SelectItem value="georgian">Грузинская</SelectItem>
                      <SelectItem value="mexican">Мексиканская</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Средний чек</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Любой" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любой</SelectItem>
                      <SelectItem value="1000">До 1000 ₸</SelectItem>
                      <SelectItem value="2000">1000-2000 ₸</SelectItem>
                      <SelectItem value="3000">Свыше 2000 ₸</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-6">{title}</h2>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg mb-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && restaurants.length === 0 && !error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold mb-2">Рестораны не найдены</h3>
              <p className="text-muted-foreground">Попробуйте изменить фильтры поиска</p>
            </CardContent>
          </Card>
        )}

        {/* Restaurants Grid */}
        {!loading && restaurants.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {restaurants.map((restaurant) => (
      <RestaurantCard
        key={restaurant.id}
        restaurant={restaurant}
        getCategoryIcon={getCategoryIcon}
      />
    ))}
  </div>
)}
      </main>
  );
}
