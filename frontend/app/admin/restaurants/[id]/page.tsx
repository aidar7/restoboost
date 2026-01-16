'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const API_BASE = 'http://localhost:8000/api';

type Restaurant = {
  id: number;
  name: string;
  category: string;
  rating: number;
  avg_check: number;
  address: string;
  phone: string;
  cuisine: string[];
  description: string;
  photos: string[];
  timeslots?: Array<{
    discount: number;
    time_start: string;
    time_end: string;
    valid_from?: string;
    valid_to?: string;
    max_tables?: number;
  }>;
};

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: ( ) => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in z-50`}>
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default function AdminRestaurantEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const restaurantId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [discountForm, setDiscountForm] = useState({
    discount: '10',
    time_start: '15:00',
    time_end: '22:00',
    valid_from: '',
    valid_to: '',
    description: 'на все меню',
  });
  const [serviceId, setServiceId] = useState('');



  useEffect(() => {
  const load = async () => {
    console.log('🔍 START: Загружаем ресторан ID:', restaurantId);
    try {
      setLoading(true);
      console.log('✅ Loading set to TRUE');
      setError('');
      
      const res = await fetch(`${API_BASE}/restaurants/${restaurantId}`);
      console.log('📡 Ответ от API:', res.status, res.ok);
      
      if (!res.ok) {
        throw new Error('Failed to load restaurant');
      }
      
      const data = (await res.json()) as Restaurant;
      console.log('✅ Данные загружены:', data);
      
      setRestaurant(data);
      setOriginalData(data);
      console.log('✅ Restaurant set:', data.name);
    } catch (e) {
      console.error('❌ ОШИБКА:', e);
      setError('Ошибка при загрузке ресторана');
      console.log('✅ Error set');
      setToast({ message: 'Ошибка при загрузке ресторана', type: 'error' });
    } finally {
      setLoading(false);
      console.log('✅ Loading set to FALSE');
    }
  };

  console.log('🔍 useEffect triggered, restaurantId:', restaurantId);
  if (Number.isFinite(restaurantId)) {
    console.log('✅ ID валиден, загружаем');
    load();
  } else {
    console.log('❌ ID невалиден:', restaurantId);
  }
}, [restaurantId]);

  // Загрузить скидки
  useEffect(() => {
    if (!restaurantId) return;
    
    const loadDiscounts = async () => {
      try {
        setLoadingDiscounts(true);
        const res = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurantId}`);
        if (!res.ok) throw new Error('Failed to load discounts');
        const data = await res.json();
        setDiscounts(data);
      } catch (e) {
        console.error('Error loading discounts:', e);
      } finally {
        setLoadingDiscounts(false);
      }
    };
    
    loadDiscounts();
  }, [restaurantId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!restaurant) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    // 1) JSON для ресторана
    const restaurantPayload: any = {
      name: String(fd.get('name') || '').trim(),
      category: String(fd.get('category') || ''),
      rating: Number(fd.get('rating') || 0),
      avg_check: Number(fd.get('avg_check') || 0),
      address: String(fd.get('address') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      description: String(fd.get('description') || ''),
      cuisine: fd.getAll('cuisine') as string[],
    };

    // 2) FormData для timeslot
    const timeslotFd = new FormData();
    timeslotFd.append('discount', String(fd.get('discount') || '0'));
    timeslotFd.append('time_start', String(fd.get('time_start') || '15:00'));
    timeslotFd.append('time_end', String(fd.get('time_end') || '22:00'));
    timeslotFd.append('valid_from', String(fd.get('valid_from') || ''));
    timeslotFd.append('valid_to', String(fd.get('valid_to') || ''));
    timeslotFd.append('max_tables', String(fd.get('max_tables') || '4'));

    try {
      setSaving(true);

      // 1. Обновляем ресторан
      const res1 = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurantPayload),
      });

      if (!res1.ok) {
        const err = await res1.json().catch(() => null);
        const errorMsg = `Ошибка сохранения ресторана: ${err?.detail || res1.status}`;
        setToast({ message: errorMsg, type: 'error' });
        return;
      }

      // 2. Обновляем/создаём дефолтный timeslot
      const res2 = await fetch(`${API_BASE}/restaurants/${restaurantId}/timeslot`, {
        method: 'PUT',
        body: timeslotFd,
      });

      if (!res2.ok) {
        const err = await res2.json().catch(() => null);
        const errorMsg = `Ошибка сохранения акции: ${err?.detail || res2.status}`;
        setToast({ message: errorMsg, type: 'error' });
        return;
      }

      // Успешно сохранено
      const changes: string[] = [];
      
      if (restaurantPayload.name !== originalData?.name) {
        changes.push(`Название: "${restaurantPayload.name}"`);
      }
      if (restaurantPayload.rating !== originalData?.rating) {
        changes.push(`Рейтинг: ${restaurantPayload.rating}`);
      }
      if (restaurantPayload.avg_check !== originalData?.avg_check) {
        changes.push(`Средний чек: ${restaurantPayload.avg_check}₸`);
      }
      if (fd.get('discount') !== String(originalData?.timeslots?.[0]?.discount || 0)) {
        changes.push(`Скидка: ${fd.get('discount')}%`);
      }
      if (fd.get('time_start') !== originalData?.timeslots?.[0]?.time_start?.slice(0, 5)) {
        changes.push(`Время начала: ${fd.get('time_start')}`);
      }
      if (fd.get('time_end') !== originalData?.timeslots?.[0]?.time_end?.slice(0, 5)) {
        changes.push(`Время конца: ${fd.get('time_end')}`);
      }

      const changesText = changes.length > 0 ? `\n${changes.join('\n')}` : '';
      setToast({ 
        message: `✨ Ресторан успешно обновлен!${changesText}`, 
        type: 'success' 
      });

      // Редирект через 2 секунды
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (e) {
      console.error(e);
      setToast({ message: 'Ошибка сети при сохранении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

    const handleSaveDiscount = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        setSaving(true);
        
        const formData = new FormData();
        formData.append('restaurant_id', String(restaurantId));
        formData.append('service_id', serviceId || '');
        formData.append('discount', String(discountForm.discount));
        formData.append('time_start', discountForm.time_start + ':00');
        formData.append('time_end', discountForm.time_end + ':00');
        formData.append('valid_from', discountForm.valid_from);
        formData.append('valid_to', discountForm.valid_to);
        formData.append('description', discountForm.description);
        
        const method = editingDiscount ? 'PUT' : 'POST';
        const url = editingDiscount 
          ? `${API_BASE}/bookings/discount_rules/${editingDiscount.id}`
          : `${API_BASE}/bookings/discount_rules`;
        
        const res = await fetch(url, {
          method,
          body: formData,
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || 'Failed to save discount');
        }
        
        setToast({ 
          message: editingDiscount ? '✅ Скидка обновлена!' : '✅ Скидка добавлена!', 
          type: 'success' 
        });
        
        setShowDiscountForm(false);
        setEditingDiscount(null);
        setDiscountForm({
          discount: '10',
          time_start: '15:00',
          time_end: '22:00',
          valid_from: '',
          valid_to: '',
          description: 'на все меню',
        });
        
        // Перезагрузить скидки
        const reloadRes = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurantId}`);
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setDiscounts(data);
        }
      } catch (e) {
        console.error(e);
        setToast({ message: `❌ Ошибка: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`, type: 'error' });
      } finally {
        setSaving(false);
      }
    };


    
    const handleDeleteDiscount = async (discountId: number) => {
      if (!confirm('Удалить эту скидку?')) return;
      
      try {
        setSaving(true);
        const res = await fetch(`${API_BASE}/bookings/discount_rules/${discountId}?restaurant_id=${restaurantId}`, {
          method: 'DELETE',
        });
        
        if (!res.ok) throw new Error('Failed to delete discount');
        
        setToast({ message: '✅ Скидка удалена!', type: 'success' });
        
        // Перезагрузить скидки
        const reloadRes = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurantId}`);
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setDiscounts(data);
        }
      } catch (e) {
        console.error(e);
        setToast({ message: '❌ Ошибка при удалении скидки', type: 'error' });
      } finally {
        setSaving(false);
      }
    };


    console.log('🔄 RENDER: loading =', loading, ', restaurant =', restaurant ? restaurant.name : 'null', ', error =', error);
      // ✅ LOADING STATE (строка 190-199)
    if (loading) {
      return (
        <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            {/* Карточка */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-pink-100">
              {/* Иконка */}
              <div className="mb-6">
                <div className="inline-block relative">
                  <div className="text-7xl animate-pulse">🍽️</div>
                  <div className="absolute inset-0 animate-spin rounded-full h-20 w-20 border-2 border-transparent border-t-pink-500 border-r-pink-500"></div>
                </div>
              </div>
              
              {/* Текст */}
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Загружаем ресторан</h2>
              <p className="text-gray-500 mb-6">Сейчас покажем вам все детали...</p>
              
              {/* Прогресс бар */}
              <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }


    // ✅ ERROR STATE (строка 201-212)
    if (!restaurant) {
      return (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
              {/* Иконка ошибки */}
              <div className="text-6xl mb-6">❌</div>
              
              {/* Текст */}
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Ресторан не найден</h2>
              <p className="text-gray-500 mb-6">{error || 'К сожалению, этого ресторана больше нет'}</p>
              
              {/* Кнопка */}
              <Link 
                href="/" 
                className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                ← Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      );
    }
    console.log('📺 Показываем УСПЕХ STATE');


  const ts = restaurant.timeslots?.[0];

  return (
    <div className="min-h-screen">
        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Breadcrumbs items={[
            { label: 'Админ', href: '/admin' },
            { label: 'Рестораны', href: '/admin' },
            { label: `Редактирование #${restaurant.id}` }
          ]} />

          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-6">✏️ Редактировать ресторан</h1>
              <p className="text-gray-600">ID: {restaurant.id}</p>
            </div>
          </div>

          {/* TABS */}
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="discounts">Скидки ({discounts.length})</TabsTrigger>
            </TabsList>

            {/* TAB 1: ИНФОРМАЦИЯ */}
            <TabsContent value="info">
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-200">
                <form className="space-y-6" onSubmit={handleSave}>
                  {/* Основные поля */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Название *</label>
                      <input
                        name="name"
                        defaultValue={restaurant.name}
                        required
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Категория *</label>
                      <select
                        name="category"
                        defaultValue={restaurant.category}
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      >
                        <option value="restaurant">🍽️ Ресторан</option>
                        <option value="cafe">☕ Кофе</option>
                        <option value="street_food">🌮 Street Food</option>
                        <option value="bar">🍺 Бар</option>
                        <option value="bakery">🥐 Пекарня</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Рейтинг *</label>
                      <input
                        name="rating"
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        defaultValue={restaurant.rating}
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Средний чек *</label>
                      <input
                        name="avg_check"
                        type="number"
                        min="0"
                        step="100"
                        defaultValue={restaurant.avg_check}
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Адрес *</label>
                      <input
                        name="address"
                        defaultValue={restaurant.address}
                        required
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон *</label>
                      <input
                        name="phone"
                        defaultValue={restaurant.phone}
                        required
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
                    <textarea
                      name="description"
                      defaultValue={restaurant.description || ''}
                      rows={4}
                      className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                    />
                  </div>

                  {/* Кухня */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Кухня *</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        'Европейская', 'Итальянская', 'Азиатская', 'Японская',
                        'Русская', 'Грузинская', 'Узбекская', 'Мексиканская',
                        'Турецкая', 'Вегетарианская', 'Стейк-хаус', 'Бургеры',
                      ].map((c) => (
                        <label
                          key={c}
                          className="cursor-pointer block text-center border-2 border-gray-300 rounded-lg px-4 py-2.5 font-medium hover:border-pink-400 transition"
                        >
                          <input
                            type="checkbox"
                            name="cuisine"
                            value={c}
                            defaultChecked={restaurant.cuisine?.includes(c)}
                            className="mr-2"
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Настройки акции */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-5 rounded-lg border-2 border-pink-200">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span>⏰</span> Настройки акции
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Скидка *
                        </label>
                        <select
                          name="discount"
                          defaultValue={ts?.discount ?? 20}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 font-semibold focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        >
                          <option value={50}>50% - Максимальная скидка</option>
                          <option value={40}>40% - Высокая скидка</option>
                          <option value={30}>30% - Средняя скидка</option>
                          <option value={20}>20% - Стандартная скидка</option>
                          <option value={10}>10% - Малая скидка</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Начало времени
                        </label>
                        <input
                          type="time"
                          name="time_start"
                          defaultValue={ts?.time_start?.slice(0, 5) || '15:00'}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Конец времени
                        </label>
                        <input
                          type="time"
                          name="time_end"
                          defaultValue={ts?.time_end?.slice(0, 5) || '22:00'}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Дата начала действия *
                        </label>
                        <input
                          type="date"
                          name="valid_from"
                          defaultValue={ts?.valid_from || ''}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Дата конца действия *
                        </label>
                        <input
                          type="date"
                          name="valid_to"
                          defaultValue={ts?.valid_to || ''}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Макс. столов
                        </label>
                        <input
                          type="number"
                          name="max_tables"
                          min={1}
                          defaultValue={ts?.max_tables || 4}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition shadow-md"
                    >
                      {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
                    </button>
                    <Link
                      href="/admin"
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-3 rounded-lg transition shadow-md"
                    >
                      ✕ Отмена
                    </Link>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* TAB 2: СКИДКИ */}
            <TabsContent value="discounts">
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-200 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Управление скидками</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscountForm(!showDiscountForm);
                      setEditingDiscount(null);
                      setDiscountForm({
                        discount: '10',
                        time_start: '15:00',
                        time_end: '22:00',
                        valid_from: '',
                        valid_to: '',
                        description: 'на все меню',
                      });
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    ➕ Добавить скидку
                  </button>
                </div>

                {/* ФОРМА ДОБАВЛЕНИЯ */}
                {showDiscountForm && (
                  <form onSubmit={handleSaveDiscount} className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Скидка *
                        </label>
                        <select
                          name="discount"
                          defaultValue={ts?.discount ?? 20}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 font-semibold focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition outline-none"
                        >
                          <option value={50}>50% - Максимальная скидка</option>
                          <option value={40}>40% - Высокая скидка</option>
                          <option value={30}>30% - Средняя скидка</option>
                          <option value={20}>20% - Стандартная скидка</option>
                          <option value={10}>10% - Малая скидка</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Начало времени</label>
                        <input
                          type="time"
                          value={discountForm.time_start}
                          onChange={(e) => setDiscountForm({ ...discountForm, time_start: e.target.value })}
                          className="w-full border-2 border-gray-300 rounded-lg p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Конец времени</label>
                        <input
                          type="time"
                          value={discountForm.time_end}
                          onChange={(e) => setDiscountForm({ ...discountForm, time_end: e.target.value })}
                          className="w-full border-2 border-gray-300 rounded-lg p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">От (дата)</label>
                        <input
                          type="date"
                          value={discountForm.valid_from}
                          onChange={(e) => setDiscountForm({ ...discountForm, valid_from: e.target.value })}
                          className="w-full border-2 border-gray-300 rounded-lg p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">До (дата)</label>
                        <input
                          type="date"
                          value={discountForm.valid_to}
                          onChange={(e) => setDiscountForm({ ...discountForm, valid_to: e.target.value })}
                          className="w-full border-2 border-gray-300 rounded-lg p-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Описание</label>
                        <input
                          type="text"
                          value={discountForm.description}
                          onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                          className="w-full border-2 border-gray-300 rounded-lg p-2"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-semibold"
                      >
                        {saving ? 'Сохранение...' : editingDiscount ? 'Обновить' : 'Добавить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountForm(false);
                          setEditingDiscount(null);
                        }}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}

                {/* ТАБЛИЦА */}
                {loadingDiscounts ? (
                  <p className="text-gray-500">Загрузка скидок...</p>
                ) : discounts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Скидок нет</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="text-left p-3">Скидка</th>
                          <th className="text-left p-3">Время</th>
                          <th className="text-left p-3">Период</th>
                          <th className="text-left p-3">Статус</th>
                          <th className="text-left p-3">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discounts.map((d) => (
                          <tr key={d.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-semibold text-lg text-green-600">-{d.discount}%</td>
                            <td className="p-3">{d.time_start?.slice(0, 5)} - {d.time_end?.slice(0, 5)}</td>
                            <td className="p-3">{d.valid_from} до {d.valid_to}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${d.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {d.is_active ? '✅ Активна' : '❌ Неактивна'}
                              </span>
                            </td>
                            <td className="p-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDiscount(d);
                                  setDiscountForm({
                                    discount: String(d.discount),
                                    time_start: d.time_start?.slice(0, 5) || '15:00',
                                    time_end: d.time_end?.slice(0, 5) || '22:00',
                                    valid_from: d.valid_from,
                                    valid_to: d.valid_to,
                                    description: d.description,
                                  });
                                  setShowDiscountForm(true);
                                }}
                                className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiscount(d.id)}
                                className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded"
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
}
