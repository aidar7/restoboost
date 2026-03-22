'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, Clock, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { API_BASE } from '@/lib/config';

interface Booking {
  id: number;
  restaurant_name: string;
  booking_datetime: string;
  party_size: number;
  guest_name: string;
  guest_phone: string;
  status: string;
  confirmation_code: string;
  discount_applied?: number;
  created_at?: string;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadBookings = async (userPhone: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE}/api/bookings/test?phone=${encodeURIComponent(userPhone)}`);
      
      if (!res.ok) {
        throw new Error('Ошибка загрузки бронирований');
      }

      const data = await res.json();
      setBookings(data.bookings || []);
      setSubmitted(true);
      
      // Сохраняем номер в localStorage
      localStorage.setItem('user_phone', userPhone);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки бронирований');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      setError('Пожалуйста, введите номер телефона');
      return;
    }

    loadBookings(phone.trim());
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Разделяем брони по статусам
  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success-light text-success">Активная</Badge>;
      case 'completed':
        return <Badge className="bg-info-light text-info">Завершена</Badge>;
      case 'cancelled':
        return <Badge className="bg-error-light text-error">Отменена</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return {
        date: date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: dateTimeStr, time: '' };
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const { date, time } = formatDateTime(booking.booking_datetime);
    const isCopied = copiedCode === booking.confirmation_code;

    return (
      <Card className="p-6 mb-4 hover:shadow-lg transition-shadow border border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: Restaurant Info */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {booking.restaurant_name}
            </h3>

            <div className="space-y-2.5 text-sm text-muted-foreground">
              {/* Date */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                <span>{date}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                <span>{time}</span>
              </div>

              {/* Party Size */}
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                <span>{booking.party_size} {booking.party_size === 1 ? 'гость' : 'гостей'}</span>
              </div>

              {/* Guest Name */}
              <div className="text-foreground pt-2 border-t border-border/30">
                <span className="font-semibold">Имя:</span> {booking.guest_name}
              </div>

              {/* Confirmation Code */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Код:</span>
                <code className="bg-gray-50 px-2 py-1 rounded text-foreground font-mono">
                  {booking.confirmation_code}
                </code>
                <button
                  onClick={() => copyToClipboard(booking.confirmation_code)}
                  className="p-1 hover:bg-gray-50 rounded transition-colors"
                  title="Скопировать код"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Discount */}
              {booking.discount_applied && booking.discount_applied > 0 && (
                <div className="text-success font-semibold pt-2">
                  💰 Скидка: {booking.discount_applied}%
                </div>
              )}
            </div>
          </div>

          {/* Right: Status & Actions */}
          <div className="flex flex-col items-end gap-3 md:pt-1">
            {getStatusBadge(booking.status)}

            {booking.status === 'confirmed' && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-error border-error-light hover:bg-error-light"
              >
                Отменить
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title="Мои бронирования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Мои бронирования' },
        ]}
      >
        {!submitted ? (
          // Форма ввода номера телефона
          <div className="mt-8">
            <Card className="p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Найти мои бронирования
              </h2>
              <p className="text-muted-foreground mb-6">
                Введите номер телефона, который вы использовали при бронировании
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Номер телефона
                  </label>
                  <Input
                    type="tel"
                    placeholder="+7 (701) 220-11-80"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError(null);
                    }}
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-error-light border border-error-light rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-booking hover:bg-booking-hover text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Загрузка...
                    </>
                  ) : (
                    'Найти бронирования'
                  )}
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          // Список бронирований
          <>
            <div className="mt-8 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground">
                  Номер телефона: <span className="font-semibold text-foreground">{phone}</span>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setPhone('');
                  setBookings([]);
                  setError(null);
                }}
              >
                Изменить номер
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-booking" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="mt-8 text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-lg font-medium text-muted-foreground">У вас пока нет бронирований</p>
                <p className="text-muted-foreground mt-2">Забронируйте ресторан, чтобы увидеть его здесь</p>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {/* Active Bookings */}
                {activeBookings.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Активные бронирования ({activeBookings.length})
                    </h2>
                    {activeBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}

                {/* Completed Bookings */}
                {completedBookings.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Завершённые бронирования ({completedBookings.length})
                    </h2>
                    {completedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}

                {/* Cancelled Bookings */}
                {cancelledBookings.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Отменённые бронирования ({cancelledBookings.length})
                    </h2>
                    {cancelledBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </PageHeader>
    </div>
  );
}
