'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Download, Share2, Home, Calendar } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface BookingDetails {
  id: number;
  confirmation_code: string;
  restaurant_name: string;
  booking_datetime: string;
  party_size: number;
  guest_name: string;
  guest_phone: string;
  discount_applied: number;
  status: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ✅ Отдельный компонент с useSearchParams
function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const confirmationCode = searchParams.get('code');
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // ... весь твой код useEffect, функции copyToClipboard и т.д. ...
  // (КОПИРУЙ ВСЁ ИЗ СТАРОГО КОМПОНЕНТА СЮДА)

  useEffect(() => {
    if (!bookingId || !confirmationCode) {
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data);
        }
      } catch (e) {
        console.error('Error fetching booking:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, confirmationCode]);

  useEffect(() => {
    if (confirmationCode) {
      const qrData = JSON.stringify({
        code: confirmationCode,
        bookingId: bookingId,
        type: 'restoboost_booking'
      });

      QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H'
      }).then((url: string) => {
        setQrCodeUrl(url);
      }).catch((err: Error) => {
        console.error('QR Code generation failed:', err);
      });
    }
  }, [confirmationCode, bookingId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(confirmationCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `booking-${confirmationCode}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handleShare = async () => {
    const shareText = `Моя бронь в ресторане! Код подтверждения: ${confirmationCode}`;
    if (navigator.share) {
      await navigator.share({
        title: 'Подтверждение брони',
        text: shareText,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('Текст скопирован в буфер обмена');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!confirmationCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Ошибка</h2>
          <p className="text-gray-600 mb-6">Бронь не найдена</p>
          <Link href="/">
            <Button className="w-full">На главную</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50">
      {/* ВСЯ ТВОЯ РАЗМЕТКА - ОСТАВЬ КАК ЕСТЬ */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Подтверждение брони</h1>
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Home size={18} />
              На главную
            </Button>
          </Link>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Бронь успешно создана!
          </h2>
          <p className="text-gray-600">
            Сохраните код подтверждения - он понадобится при входе в ресторан
          </p>
        </div>

        {/* Confirmation Code Card */}
        <Card className="bg-white border-2 border-green-200 p-8 mb-8 text-center">
          <p className="text-sm text-gray-600 font-semibold mb-2">КОД ПОДТВЕРЖДЕНИЯ</p>
          <div className="bg-gray-100 rounded-lg p-6 mb-4 font-mono">
            <p className="text-4xl font-bold text-gray-900 tracking-widest">
              {confirmationCode}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-teal-700 text-white hover:bg-teal-800'
            }`}
          >
            <Copy size={18} />
            {copied ? 'Скопировано!' : 'Копировать код'}
          </button>
        </Card>

        {/* QR Code Section */}
        <Card className="bg-white p-6 mb-8 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">QR код для подтверждения</h3>
          <p className="text-sm text-gray-600 mb-4">
            Покажите этот код при входе в ресторан для получения скидки
          </p>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-lg mb-4 inline-block">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-64 h-64 border-4 border-gray-800 rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-white border-4 border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Генерация QR...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p className="flex items-center justify-center gap-2">
              <span className="font-semibold">Код брони:</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{confirmationCode}</span>
            </p>
            <p className="text-xs text-gray-500">
              Покажите этот QR код или назовите код подтверждения при входе
            </p>
          </div>

          {qrCodeUrl && (
            <Button
              onClick={downloadQR}
              variant="outline"
              className="flex items-center gap-2 mx-auto"
            >
              <Download size={18} />
              Сохранить QR код
            </Button>
          )}
        </Card>

        {/* Booking Details */}
        <Card className="bg-white p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Детали брони</h3>
          
          <div className="space-y-4">
            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 font-semibold">РЕСТОРАН</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {booking?.restaurant_name || 'Discovery Coffee'}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">✓ Подтверждено</Badge>
            </div>

            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 font-semibold">ДАТА И ВРЕМЯ</p>
                <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar size={20} />
                  {booking?.booking_datetime 
                    ? new Date(booking.booking_datetime).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '10 января 2026 г., 21:00'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 font-semibold">КОЛИЧЕСТВО ГОСТЕЙ</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {booking?.party_size || 2} {booking?.party_size === 1 ? 'гость' : 'гостей'}
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 font-semibold">ИМЯ ГОСТЯ</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {booking?.guest_name || 'Иван'}
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600 font-semibold">ТЕЛЕФОН</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {booking?.guest_phone || '+7 701 220 1180'}
                </p>
              </div>
            </div>

            {(booking?.discount_applied || 20) > 0 && (
              <div className="flex items-start justify-between bg-orange-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">СКИДКА</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    -{booking?.discount_applied || 20}%
                  </p>
                </div>
                <Badge className="bg-orange-100 text-orange-800">
                  💰 Экономия на этот раз
                </Badge>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex items-center justify-center gap-2 h-12 text-base"
          >
            <Share2 size={20} />
            Поделиться
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/my-bookings" className="block">
            <Button className="w-full h-12 text-base bg-teal-700 hover:bg-teal-800">
              📋 Мои брони
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12 text-base">
              🏠 На главную
            </Button>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-gray-700 mb-2">
            ℹ️ <strong>Важно:</strong> Пожалуйста, приходите за 10-15 минут до забронированного времени
          </p>
          <p className="text-xs text-gray-600">
            Если вы не сможете прийти, отмените бронь минимум за 2 часа до времени
          </p>
        </div>
      </main>
    </div>
  );
}

// ✅ Экспортируемая обёртка с Suspense
export default function BookingConfirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  );
}
