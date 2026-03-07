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
        return <Badge className="bg-green-100 text-green-800">Активная</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Завершена</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Отменена</Badge>;
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
      <Card className="p-6 mb-4 hover:shadow-lg transition-shadow border border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: Restaurant Info */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {booking.restaurant_name}
            </h3>

            <div className="space-y-2.5 text-sm text-gray-600">
              {/* Date */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <span>{date}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <span>{time}</span>
              </div>

              {/* Party Size */}
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <span>{booking.party_size} {booking.party_size === 1 ? 'гость' : 'гостей'}</span>
              </div>

              {/* Guest Name */}
              <div className="text-gray-700 pt-2 border-t border-gray-200/30">
                <span className="font-semibold">Имя:</span> {booking.guest_name}
              </div>

              {/* Confirmation Code */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Код:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-gray-900 font-mono">
                  {booking.confirmation_code}
                </code>
                <button
                  onClick={() => copyToClipboard(booking.confirmation_code)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Скопировать код"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Discount */}
              {booking.discount_applied && booking.discount_applied > 0 && (
                <div className="text-green-600 font-semibold pt-2">
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
                className="text-red-600 border-red-200 hover:bg-red-50"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Найти мои бронирования
              </h2>
              <p className="text-gray-600 mb-6">
                Введите номер телефона, который вы использовали при бронировании
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white"
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
                <p className="text-gray-600">
                  Номер телефона: <span className="font-semibold text-gray-900">{phone}</span>
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
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="mt-8 text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-lg font-medium text-gray-600">У вас пока нет бронирований</p>
                <p className="text-gray-500 mt-2">Забронируйте ресторан, чтобы увидеть его здесь</p>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {/* Active Bookings */}
                {activeBookings.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
