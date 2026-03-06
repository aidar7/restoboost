'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/config';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/breadcrumbs'; 
import { PageHeader } from '@/components/PageHeader';

// shadcn tabs (обычно: '@/components/ui/tabs')
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ChevronLeft, MapPin, Share2, Heart, ChevronRight, X } from 'lucide-react';

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

interface Timeslot {
  time: string;
  available: boolean;
  discount: number;
  booked_guests: number;
  capacity: number;
}

const API_BASE_URL = 'https://restoboost.onrender.com';


function Lightbox({
  open,
  photos,
  currentPhotoIndex,
  onClose,
  onPrev,
  onNext,
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

function HeroGallery({
  photos,
  onOpen,
  onPick,
}: {
  photos: string[];
  onOpen: (index: number) => void;
  onPick: (index: number) => void;
}) {
  if (!photos?.length) return null;

  const main = photos[0];
  const rest = photos.slice(1, 5);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="md:col-span-2 rounded-xl overflow-hidden border border-border bg-card"
        >
          <img src={main} alt="" className="h-72 md:h-80 w-full object-cover" />
        </button>

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {rest.map((p, idx) => {
            const realIdx = idx + 1;
            return (
              <button
                key={p + idx}
                type="button"
                onClick={() => onOpen(realIdx)}
                className="rounded-xl overflow-hidden border border-border bg-card"
              >
                <img src={p} alt="" className="h-36 md:h-[156px] w-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      {/* мини-ряд превью (опционально) */}
      {photos.length > 5 && (
        <div className="flex gap-2 overflow-x-auto mt-3">
          {photos.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => onPick(i)}
              className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0"
            >
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RestaurantDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const restaurantId = params?.id;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [tab, setTab] = useState<'main' | 'details' | 'reviews'>('main');

  // booking
  const [selectedDate, setSelectedDate] = useState('');
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDiscount, setSelectedDiscount] = useState(0);

  const [formData, setFormData] = useState({
    guest_name: '',
    phone: '',
    guest_email: '',
    party_size: '2',
    special_requests: '',
  });

  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // gallery
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const minDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }, []);

  // ↓↓↓ ЗАМЕНИТЕ ВАШ useEffect НА ЭТОТ ↓↓↓

  useEffect(() => {
    if (!restaurantId) {
      // Если ID нет, убедимся, что мы не в состоянии вечной загрузки.
      setLoading(false); 
      return;
    }

    const controller = new AbortController();

    const loadRestaurant = async () => {
      // ИЗМЕНЕНИЕ 1: Сбрасываем все состояния перед новым запросом.
      // Это гарантирует, что мы не показываем старые данные или ошибки.
      setRestaurant(null);
      setError(null);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          // Если ответ не ОК, это ошибка.
          throw new Error(`Ошибка сети: ${res.status}`);
        }

        const data = await res.json();
        // ИЗМЕНЕНИЕ 2: Устанавливаем данные и СРАЗУ ЖЕ выключаем загрузку.
        // Это атомарная операция, которая предотвращает гонку состояний.
        setRestaurant(data);
        setLoading(false); 

      } catch (e: any) {
        if (e?.name === 'AbortError') {
          console.log('Запрос отменен');
          return;
        }
        // Если произошла ошибка, устанавливаем ошибку и выключаем загрузку.
        setError('Не удалось загрузить данные ресторана.');
        setLoading(false);
      } 
      // Блок finally нам больше не нужен, так как мы управляем setLoading в try/catch.
    };

    loadRestaurant();

    return () => {
      controller.abort();
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !selectedDate) {
      setTimeslots([]);
      return;
    }

    const controller = new AbortController();

    const loadTimeslots = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/bookings/available-slots?restaurant_id=${restaurantId}&date=${selectedDate}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed to load timeslots');
        const data = await res.json();
        setTimeslots(data);
        setSelectedTime('');
        setSelectedDiscount(0);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setTimeslots([]);
      }
    };

    loadTimeslots();
    return () => controller.abort();
  }, [restaurantId, selectedDate]);

  const handleSelectTimeslot = (time: string) => {
    const slot = timeslots.find((s) => s.time === time);
    if (!slot || !slot.available) return;
    setSelectedTime(time);
    setSelectedDiscount(slot.discount);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ТОЛЬКО ИЗМЕНЕННАЯ ЧАСТЬ - функция handleSubmitBooking
  // Найди эту функцию в твоем файле и замени её

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId || !selectedDate || !selectedTime) {
      setBookingResult({ success: false, message: 'Заполните все поля' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          restaurant_id: String(restaurantId),
          restaurant_name: restaurant?.name || 'Demo',
          booking_datetime: `${selectedDate}T${selectedTime}:00`,
          party_size: formData.party_size,
          guest_name: formData.guest_name,
          phone: formData.phone,
          guest_email: formData.guest_email || '',
          special_requests: formData.special_requests,
        }),
      });

      console.log('Status:', res.status);
      console.log('StatusText:', res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Error details:', errorText);
        throw new Error(`Booking failed: ${errorText}`);
      }

      const result = await res.json();

      if (result.success && result.data) {
        const bookingId = result.data.id;
        const confirmationCode = result.data.confirmation_code;

        console.log('DEBUG: bookingId =', bookingId, 'confirmationCode =', confirmationCode);

        if (bookingId && confirmationCode) {
          // Редирект на страницу подтверждения
          router.push(`/booking-confirmation?booking_id=${bookingId}&code=${confirmationCode}`);
        }
      } else {
        // Ошибка
        setBookingResult({ success: false, message: result.message || 'Ошибка бронирования' });
      }

    } catch (e) {
      setBookingResult({ success: false, message: e instanceof Error ? e.message : 'Ошибка бронирования' });
    } finally {
      setIsSubmitting(false);
    }
  };


  // ↓↓↓ ВСТАВЬТЕ ЭТОТ КОД НА МЕСТО СТАРОГО ↓↓↓

  // 1. Сначала показываем загрузчик, если loading=true ИЛИ ID еще не определился.
  if (loading || !restaurantId) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  // 2. Теперь, когда загрузка точно завершена, проверяем на ошибки.
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Ошибка</h2>
          <p>{error}</p>
          <Button className="mt-4 w-full" onClick={() => router.push('/')}>
            Главная
          </Button>
        </Card>
      </div>
    );
  }

  // 3. И только теперь, если нет ни загрузки, ни ошибки, но ресторана нет - он не найден.
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Ошибка</h2>
          <p>Ресторан не найден</p>
          <Button className="mt-4 w-full" onClick={() => router.push('/')}>
            Главная
          </Button>
        </Card>
      </div>
    );
  }

// ↑↑↑ КОНЕЦ БЛОКА ДЛЯ ЗАМЕНЫ ↑↑↑


  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowLightbox(true);
  };

  return (
    
    <div className="min-h-screen bg-background">
      
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Breadcrumbs 
            items={[
              { label: '🏠 Главная', href: '/' },
              { label: restaurant.name }
            ]} 
          />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* HERO */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{restaurant.name}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {restaurant.rating && (
              <Badge variant="secondary" className="text-base py-1 px-3">
                ★ {restaurant.rating}
              </Badge>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>{restaurant.address}</span>
            </div>

            <div className="text-muted-foreground">💰 От {restaurant.avg_check} ₸</div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {restaurant.cuisine.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))}
          </div>

          {/* PHOTOS under hero */}
          <HeroGallery
            photos={restaurant.photos}
            onOpen={openLightbox}
            onPick={(i) => setCurrentPhotoIndex(i)}
          />
        </div>

        {/* TABS (3 sections) */}
        <div className="mt-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="main">Основная</TabsTrigger>
              <TabsTrigger value="details">Детали</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
            </TabsList>

            {/* TAB 1: Main (menu + booking + location — по желанию) */}
            <TabsContent value="main" className="mt-6 space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-2">Информация</h2>
                <div className="text-muted-foreground">
                  <div>{restaurant.address}</div>
                  <div className="mt-2">Телефон: {restaurant.phone}</div>
                </div>
              </Card>
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Бронирование</h2>

                {bookingResult && (
                  <div
                    className={[
                      'p-4 rounded-lg mb-4',
                      bookingResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                    ].join(' ')}
                  >
                    {bookingResult.message}
                  </div>
                )}

                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Дата <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={minDate}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Гостей <span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={formData.party_size}
                        onValueChange={(value) => setFormData({ ...formData, party_size: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num} {num === 1 ? 'гость' : 'гостей'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Время <span className="text-destructive">*</span>
                      </label>
                      <Input value={selectedTime || 'Выберите слот ниже'} readOnly />
                    </div>
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="block text-sm font-semibold mb-3">
                        Выберите время <span className="text-destructive">*</span>
                      </label>

                      {timeslots.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">❌ Нет доступных слотов</div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {timeslots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => handleSelectTimeslot(slot.time)}
                              className={[
                                'p-3 rounded-lg border-2 transition-all text-sm font-medium text-center',
                                selectedTime === slot.time
                                  ? 'bg-pink-500 text-white border-pink-500'
                                  : 'border-border hover:border-pink-500',
                                !slot.available ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-background',
                              ].join(' ')}
                            >
                              <div className="font-semibold">{slot.time}</div>
                              {slot.discount > 0 && <div className="text-xs mt-1">-{slot.discount}%</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Ваше имя <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="text"
                        name="guest_name"
                        value={formData.guest_name}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Телефон <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Email</label>
                      <Input
                        type="email"
                        name="guest_email"
                        value={formData.guest_email}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Пожелания</label>
                      <Textarea
                        name="special_requests"
                        value={formData.special_requests}
                        onChange={handleFormChange}
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedDate || !selectedTime || !formData.guest_name || !formData.phone || isSubmitting}
                    className="w-full mt-auto bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Бронирование...' : 'Забронировать'}
                  </Button>

                  {selectedDiscount > 0 && (
                    <div className="text-center text-sm text-green-600 font-semibold">
                      Скидка {selectedDiscount}% на это время
                    </div>
                  )}
                </form>
              </Card>
            </TabsContent>

            {/* TAB 2: Details */}
            <TabsContent value="details" className="mt-6 space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-2">О ресторане</h2>
                {restaurant.description ? (
                  <p className="text-muted-foreground">{restaurant.description}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Добавь текст: концепция, часы работы, парковка, условия, кухня, языки персонала.
                  </p>
                )}
              </Card>
            </TabsContent>

            {/* TAB 3: Reviews */}
            <TabsContent value="reviews" className="mt-6 space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-2">Отзывы</h2>
                <p className="text-muted-foreground">
                  Здесь: рейтинг, breakdown (еда/сервис/атмосфера) + список отзывов.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Lightbox
        open={showLightbox}
        photos={restaurant.photos}
        currentPhotoIndex={currentPhotoIndex}
        onClose={() => setShowLightbox(false)}
        onPrev={() =>
          setCurrentPhotoIndex((prev) => (prev - 1 + restaurant.photos.length) % restaurant.photos.length)
        }
        onNext={() => setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.photos.length)}
      />
    </div>
  );
}
