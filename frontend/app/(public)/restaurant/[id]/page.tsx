'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/config';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { RestaurantInfoCard } from '@/components/RestaurantInfoCard';

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

type TabValue = 'main' | 'details' | 'reviews';

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const day = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${day} ${dd}.${mm}`;
}

function addDays(dateStr: string, n: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + n);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

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
      <img src={photos[currentPhotoIndex]} alt="Full size" className="max-w-5xl max-h-[90vh] object-contain" />
      <button onClick={onPrev} className="absolute left-4 text-white" type="button">
        <ChevronLeft className="w-9 h-9" />
      </button>
      <button onClick={onNext} className="absolute right-4 text-white" type="button">
        <ChevronRight className="w-9 h-9" />
      </button>
    </div>
  );
}

// STEP 2 — компонент таймслота
function TimeslotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: Timeslot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!slot.available}
      onClick={onSelect}
      className={[
        'flex-shrink-0 snap-start w-[72px] flex flex-col items-center rounded-xl border-2 transition-all pt-1.5 pb-2 px-1',
        !slot.available
          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 border-border'
          : selected
            ? 'bg-green-600 text-white border-green-600'
            : 'border-border hover:border-green-600 bg-background',
      ].join(' ')}
    >
      {/* Бейдж скидки */}
      <div className="h-5 flex items-center justify-center mb-0.5">
        {slot.discount > 0 && (
          <span
            className={[
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap',
              selected ? 'bg-white text-green-700' : 'bg-green-600 text-white',
            ].join(' ')}
          >
            -{slot.discount}%
          </span>
        )}
      </div>

      {/* Время */}
      <div className="text-sm font-semibold leading-none">
        {slot.time}
      </div>

      {/* Подпись */}
      {slot.discount > 0 && (
        <div
          className={[
            'text-[9px] leading-tight text-center mt-1',
            selected ? 'text-green-100' : 'text-muted-foreground',
          ].join(' ')}
        >
          Скидка на всё меню
        </div>
      )}
    </button>
  );
}

function HeroGallery({
  photos, onOpen,
}: {
  photos: string[];
  onOpen: (index: number) => void;
  onPick: (index: number) => void;
}) {
  if (!photos?.length) return null;
  const main = photos[0];
  const rest = photos.slice(1, 5);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <button type="button" onClick={() => onOpen(0)} className="md:col-span-2 rounded-xl overflow-hidden border border-border bg-card">
        <img src={main} alt="" className="h-72 md:h-80 w-full object-cover" />
      </button>
      <div className="md:col-span-2 grid grid-cols-2 gap-3">
        {rest.map((p, idx) => (
          <button key={`photo-${idx}`} type="button" onClick={() => onOpen(idx + 1)} className="rounded-xl overflow-hidden border border-border bg-card">
            <img src={p} alt="" className="h-36 md:h-[156px] w-full object-cover" />
          </button>
        ))}
      </div>
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
  const [tab, setTab] = useState<TabValue>('main');

  const [selectedDate, setSelectedDate] = useState('');
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    setSelectedDate(today.toISOString().slice(0, 10));
  }, []);

  const minDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }, []);



  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const controller = new AbortController();
    const load = async () => {
      setRestaurant(null); setError(null); setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}`, {
          signal: controller.signal, cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Ошибка сети: ${res.status}`);
        setRestaurant(await res.json());
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

  useEffect(() => {
    if (!restaurantId || !selectedDate) { setTimeslots([]); return; }
    const controller = new AbortController();
    const load = async () => {
      setSlotsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/bookings/available-slots?restaurant_id=${restaurantId}&date=${selectedDate}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed');
        setTimeslots(await res.json());
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setTimeslots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [restaurantId, selectedDate]);


  // STEP 1 — единая функция смены даты
  const changeDate = (newDate: string) => {
    setSelectedDate(newDate)
    setSelectedTime('')
    setSelectedDiscount(0)
  }
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

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !selectedDate || !selectedTime) {
      setBookingResult({ success: false, message: 'Заполните все поля' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          restaurant_id: String(restaurantId),
          restaurant_name: restaurant?.name || '',
          booking_datetime: `${selectedDate}T${selectedTime}:00`,
          party_size: formData.party_size,
          guest_name: formData.guest_name,
          phone: formData.phone,
          guest_email: formData.guest_email || '',
          special_requests: formData.special_requests,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      if (result.success && result.data?.id && result.data?.confirmation_code) {
        router.push(`/booking-confirmation?booking_id=${result.data.id}&code=${result.data.confirmation_code}`);
      } else {
        setBookingResult({ success: false, message: result.message || 'Ошибка бронирования' });
      }
    } catch (e) {
      setBookingResult({ success: false, message: e instanceof Error ? e.message : 'Ошибка' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowLightbox(true);
  };

  const scrollSlots = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const checkScrollability = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);

      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [checkScrollability, timeslots]);

  if (loading || !restaurantId) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="flex items-center gap-2 text-destructive mb-4"><AlertCircle className="w-5 h-5" /><h2 className="text-xl font-bold">Ошибка</h2></div>
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

      {/* Основная сетка: 2/3 - контент, 1/3 - форма бронирования */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">

        {/* Левая колонка - контент (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Галерея */}
          <HeroGallery
            photos={restaurant.photos}
            onOpen={openLightbox}
            onPick={(i) => setCurrentPhotoIndex(i)}
          />

          {/* Табы под галереей */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="main">О ресторане</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
            </TabsList>

            {/* Объединённый таб: Информация + Описание */}
            <TabsContent value="main" className="mt-6">
              <div className="space-y-6">
                {/* Информация (бэйджи) */}
                <div>
                  <h2 className="text-lg font-bold mb-4">Информация</h2>
                  <RestaurantInfoCard restaurant={restaurant} />
                </div>

                {/* Описание ресторана */}
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

            {/* Отзывы */}
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
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Забронировать столик</h3>
              <p className="text-sm text-green-600 font-semibold mt-1">со скидкой до -50%</p>
            </div>

            <form onSubmit={handleSubmitBooking} id="booking-form" className="space-y-5">

              {/* Дата + Гости */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Дата</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => changeDate(e.target.value)}
                      min={minDate}
                      className="w-full pr-8 text-sm font-medium"
                    />
                    {selectedDate && (
                      <button type="button" onClick={() => changeDate('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Кол-во гостей</label>
                  <Select value={formData.party_size} onValueChange={(v) => setFormData({ ...formData, party_size: v })}>
                    <SelectTrigger className="text-sm font-medium"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Временные слоты */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium">Выберите время</label>
                  {timeslots.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {timeslots.filter(s => s.available).length} доступно
                    </span>
                  )}
                </div>

                <div className="relative">
                  {/* Левый градиент (появляется когда можно скроллить влево) */}
                  <div className={`
      absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10
      bg-gradient-to-r from-background via-background/80 to-transparent
      transition-opacity duration-200
      ${canScrollLeft ? 'opacity-100' : 'opacity-0'}
    `} />

                  {/* Правый градиент (появляется когда можно скроллить вправо) */}
                  <div className={`
      absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10
      bg-gradient-to-l from-background via-background/80 to-transparent
      transition-opacity duration-200
      ${canScrollRight ? 'opacity-100' : 'opacity-0'}
    `} />

                  {/* Контейнер со слотами и стрелками */}
                  <div className="flex items-center gap-2">
                    {/* Стрелка влево - появляется только когда есть куда скроллить */}
                    <button
                      type="button"
                      onClick={() => scrollSlots('left')}
                      disabled={!canScrollLeft}
                      className={`
          flex-shrink-0 p-2 rounded-lg border border-border bg-background
          hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20
          transition-all duration-200
          ${canScrollLeft
                          ? 'opacity-100 visible'
                          : 'opacity-0 invisible pointer-events-none'
                        }
          disabled:opacity-30 disabled:cursor-not-allowed
        `}
                      aria-label="Прокрутить влево"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Сетка слотов с горизонтальным скроллом */}
                    <div
                      ref={scrollContainerRef}
                      className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 snap-x snap-mandatory scroll-smooth"
                      style={{
                        WebkitOverflowScrolling: 'touch', // для плавности на iOS
                      }}
                    >
                      {timeslots.length > 0 ? (
                        timeslots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => handleSelectTimeslot(slot.time)}
                            className={`
                flex-shrink-0 snap-start w-20
                flex flex-col items-center rounded-xl border-2 
                transition-all duration-200 pt-2 pb-2 px-1
                ${!slot.available
                                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 border-border'
                                : selectedTime === slot.time
                                  ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                                  : 'border-border hover:border-green-600 hover:shadow-md bg-background'
                              }
              `}
                          >
                            <div className="h-6 flex items-center justify-center mb-1">
                              {slot.discount > 0 && (
                                <span className={`
                    text-xs font-bold px-2 py-0.5 rounded-full
                    ${selectedTime === slot.time
                                    ? 'bg-white text-green-700'
                                    : 'bg-green-600 text-white'
                                  }
                  `}>
                                  -{slot.discount}%
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-semibold leading-none">{slot.time}</div>
                            {slot.discount > 0 && (
                              <div className={`
                  text-[9px] text-center mt-1
                  ${selectedTime === slot.time ? 'text-green-100' : 'text-muted-foreground'}
                `}>
                                Скидка
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="flex-1 text-center py-4 text-muted-foreground">
                          {slotsLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            'Нет доступных слотов'
                          )}
                        </div>
                      )}
                    </div>

                    {/* Стрелка вправо - появляется только когда есть куда скроллить */}
                    <button
                      type="button"
                      onClick={() => scrollSlots('right')}
                      disabled={!canScrollRight}
                      className={`
          flex-shrink-0 p-2 rounded-lg border border-border bg-background
          hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20
          transition-all duration-200
          ${canScrollRight
                          ? 'opacity-100 visible'
                          : 'opacity-0 invisible pointer-events-none'
                        }
          disabled:opacity-30 disabled:cursor-not-allowed
        `}
                      aria-label="Прокрутить вправо"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {!slotsLoading && !selectedTime && timeslots.length > 0 && (
                  <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Выберите время для бронирования
                  </p>
                )}
              </div>

              {/* Комментарий */}
              <div>
                <Textarea
                  name="special_requests"
                  value={formData.special_requests}
                  onChange={handleFormChange}
                  placeholder="Комментарий к брони (например: столик у окна)"
                  rows={2}
                />
              </div>

              {/* Контакты - компактно */}
              <div className="space-y-2">
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Телефон *"
                  required
                />
                <Input
                  type="email"
                  name="guest_email"
                  value={formData.guest_email}
                  onChange={handleFormChange}
                  placeholder="Email"
                />
                <Input
                  type="text"
                  name="guest_name"
                  value={formData.guest_name}
                  onChange={handleFormChange}
                  placeholder="Ваше имя *"
                  required
                />
              </div>

              {/* Ошибка бронирования */}
              {bookingResult && !bookingResult.success && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {bookingResult.message}
                </div>
              )}

              {/* Кнопка */}
              <Button
                type="submit"
                disabled={!selectedDate || !selectedTime || !formData.guest_name || !formData.phone || isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-base rounded-lg"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Бронирование...</>
                ) : (
                  'Войти и забронировать столик'
                )}
              </Button>

              {/* Скидка */}
              {selectedDiscount > 0 && (
                <div className="text-center text-sm text-green-600 font-semibold">
                  ✅ Скидка {selectedDiscount}% на это время
                </div>
              )}

              {/* Приложение */}
              <div className="pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">Еще выгоднее в мобильном приложении</p>
              </div>
              </form>
          </div>
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