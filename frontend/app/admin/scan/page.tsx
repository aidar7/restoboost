// app/admin/scan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Camera, Keyboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API_URL } from '@/lib/config';


interface BookingVerification {
  success: boolean;
  booking: {
    id: number;
    guest_name: string;
    restaurant_name: string;
    booking_datetime: string;
    party_size: number;
    discount_applied: number;
    status: string;
  };
  discount: number;
  message: string;
}

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BookingVerification | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Успешное сканирование
          setScanning(false);
          scanner?.clear();
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Игнорируем постоянные ошибки сканирования
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [scanning]);

  const verifyBooking = async (code: string) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Verifying code:', code);
      
      const response = await fetch(`${API_URL}/api/bookings/verify-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setManualCode('');
      } else {
        setError(data.detail || 'Ошибка проверки брони');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (decodedText: string) => {
    try {
      // Пробуем распарсить JSON из QR кода
      const qrData = JSON.parse(decodedText);
      if (qrData.code) {
        verifyBooking(qrData.code);
      } else {
        verifyBooking(decodedText);
      }
    } catch {
      // Если не JSON - используем как есть
      verifyBooking(decodedText);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      verifyBooking(manualCode.trim().toUpperCase());
    }
  };

  const resetState = () => {
    setResult(null);
    setError('');
    setManualCode('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          📱 Сканирование QR
        </h1>
        <p className="text-lg text-muted-foreground">Подтверждение посещений и check-in</p>
      </div>

    {/* остальной сканер */}

        
        {/* Scanner Toggle Buttons */}
        {!result && !scanning && (
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Button
              onClick={() => setScanning(true)}
              size="lg"
              className="h-24 text-lg"
            >
              <Camera className="mr-3 h-6 w-6" />
              Сканировать QR код
            </Button>
            <Button
              onClick={() => document.getElementById('manual-input')?.focus()}
              variant="outline"
              size="lg"
              className="h-24 text-lg"
            >
              <Keyboard className="mr-3 h-6 w-6" />
              Ввести код вручную
            </Button>
          </div>
        )}

        {/* QR Scanner */}
        {scanning && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Наведите камеру на QR код</CardTitle>
              <CardDescription>
                Расположите QR код в рамке для автоматического сканирования
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div id="qr-reader" className="w-full"></div>
              <Button 
                onClick={() => setScanning(false)} 
                variant="outline"
                className="w-full mt-4"
              >
                Отменить сканирование
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Input */}
        {!result && !scanning && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ввести код подтверждения</CardTitle>
              <CardDescription>
                Введите 8-значный код брони вручную
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="manual-input">Код подтверждения</Label>
                  <Input
                    id="manual-input"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="ABC12345"
                    className="text-3xl font-mono text-center tracking-widest"
                    maxLength={8}
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading || manualCode.length < 6}
                >
                  {loading ? 'Проверка...' : 'Проверить бронь'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Success Result */}
        {result && (
          <Card className="border-2 border-green-500 bg-green-50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-6 w-6" />
                Бронь подтверждена!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Guest Info */}
              <div className="bg-white p-6 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Гость</p>
                    <p className="text-xl font-bold">{result.booking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Количество</p>
                    <p className="text-xl font-bold">{result.booking.party_size} чел.</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-semibold">Ресторан</p>
                  <p className="text-lg font-bold">{result.booking.restaurant_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-semibold">Дата и время</p>
                  <p className="text-lg font-bold">
                    {new Date(result.booking.booking_datetime).toLocaleString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-semibold">Статус</p>
                  <Badge className="bg-green-100 text-green-800 mt-1">
                    {result.booking.status === 'completed' ? '✓ Завершено' : '✓ Активно'}
                  </Badge>
                </div>
              </div>

              {/* Discount Info */}
              {result.discount > 0 && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-lg text-white text-center">
                  <p className="text-sm font-semibold mb-2">СКИДКА ПРИМЕНЕНА</p>
                  <p className="text-6xl font-bold">-{result.discount}%</p>
                  <p className="text-sm mt-2 opacity-90">{result.message}</p>
                </div>
              )}

              <Button 
                onClick={resetState}
                className="w-full"
                size="lg"
              >
                Проверить другую бронь
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-2 border-red-500 bg-red-50 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 text-red-700">
                <XCircle className="h-6 w-6 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-lg mb-1">Ошибка проверки</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button 
                onClick={resetState}
                variant="outline"
                className="w-full mt-4"
              >
                Попробовать снова
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!result && !scanning && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Инструкция</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p><strong>1.</strong> Попросите гостя показать QR код или код подтверждения</p>
              <p><strong>2.</strong> Отсканируйте QR или введите код вручную</p>
              <p><strong>3.</strong> Система автоматически проверит бронь и применит скидку</p>
              <p><strong>4.</strong> После подтверждения бронь получит статус "Завершено"</p>
            </CardContent>
          </Card>
        )}
    
    </div>
  );
}
