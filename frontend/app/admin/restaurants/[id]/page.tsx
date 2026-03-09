'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';



const API_BASE = 'http://localhost:8000/api';

type Restaurant = {
  id: number;
  name: string;
  category: string;
  rating: number;
  avg_check: number;
  address: string;
  phone: string;
  city?: string;
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
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-success',
    error: 'bg-error',
    info: 'bg-info',
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
  // --- ↓ ЗАМЕНИТЕ ВСЕ СТАРЫЕ useState ДЛЯ ФОТО НА ЭТИ ↓ ---
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URL уже загруженных фото
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);     // Новые файлы для загрузки
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);    // Превью для новых файлов
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]); // URL старых фото для удаления
  // --- ↑ КОНЕЦ ЗАМЕНЫ ↑ ---

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length === 0) return;

    // Добавляем новые файлы к уже выбранным
    setSelectedPhotos(prev => [...prev, ...files]);

    // Создаем и добавляем новые превью
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);

    // Очищаем инпут, чтобы можно было выбрать те же файлы снова
    e.currentTarget.value = '';
  };


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
        setExistingPhotos(data.photos || []);
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

  // === ↓↓↓ ПОЛНОСТЬЮ ЗАМЕНИТЕ СТАРУЮ ФУНКЦИЮ handleSave НА ЭТУ ↓↓↓ ===

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);

    // Создаем FormData из формы
    const formData = new FormData(e.currentTarget);

    // Удаляем поле 'cuisine', так как мы его обработаем вручную
    formData.delete('cuisine');
    // Собираем значения из чекбоксов и добавляем как JSON-строку
    const cuisines = Array.from(e.currentTarget.querySelectorAll('input[name="cuisine"]:checked'))
      .map(el => (el as HTMLInputElement).value);
    formData.append('cuisine', JSON.stringify(cuisines));

    // Добавляем новые выбранные файлы
    selectedPhotos.forEach((photo) => {
      formData.append('photos', photo);
    });

    // Добавляем список URL старых фото для удаления
    formData.append('photos_to_delete', JSON.stringify(photosToDelete));

    try {
      const res = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
        method: 'PUT',
        body: formData, // Отправляем FormData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }));
        throw new Error(err.detail || 'Не удалось обновить ресторан');
      }

      setToast({ message: '✅ Ресторан успешно обновлен!', type: 'success' });

      setTimeout(() => {
        router.push('/admin');
      }, 2000);

    } catch (e) {
      console.error(e);
      setToast({ message: `❌ Ошибка: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // === ↑↑↑ КОНЕЦ ЗАМЕНЫ ↑↑↑ ===


  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!discountForm.discount || !discountForm.time_start || !discountForm.time_end || !discountForm.valid_from || !discountForm.valid_to) {
      setToast({ message: '❌ Заполните все обязательные поля', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('restaurant_id', String(restaurantId));
      formData.append('service_id', serviceId || '');
      formData.append('discount', String(discountForm.discount || '10'));
      formData.append('time_start', discountForm.time_start);
      formData.append('time_end', discountForm.time_end);
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
      <div className="bg-gradient-to-br from-warning-light via-white to-warning-light min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Карточка */}
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-warning-light">
            {/* Иконка */}
            <div className="mb-6">
              <div className="inline-block relative">
                <div className="text-7xl animate-pulse">🍽️</div>
                <div className="absolute inset-0 animate-spin rounded-full h-20 w-20 border-2 border-transparent border-t-pink-500 border-r-pink-500"></div>
              </div>
            </div>

            {/* Текст */}
            <h2 className="text-2xl font-bold text-foreground mb-2">Загружаем ресторан</h2>
            <p className="text-muted-foreground mb-6">Сейчас покажем вам все детали...</p>

            {/* Прогресс бар */}
            <div className="w-full bg-gray-50 rounded-full h-1 overflow-hidden">
              <div className="bg-gradient-to-r from-warning to-rose-500 h-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ✅ ERROR STATE (строка 201-212)
  if (!restaurant) {
    return (
      <div className="bg-gradient-to-br from-error-light to-warning-light min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-error-light">
            {/* Иконка ошибки */}
            <div className="text-6xl mb-6">❌</div>

            {/* Текст */}
            <h2 className="text-2xl font-bold text-foreground mb-2">Ресторан не найден</h2>
            <p className="text-muted-foreground mb-6">{error || 'К сожалению, этого ресторана больше нет'}</p>

            {/* Кнопка */}
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-warning to-rose-500 hover:from-warning/90 hover:to-warning/90 text-white font-semibold px-6 py-3 rounded-lg transition"
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
            <p className="text-muted-foreground">ID: {restaurant.id}</p>
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
            <div className="bg-card rounded-xl shadow-md p-6 md:p-8 border border-border">
              <form className="space-y-6" onSubmit={handleSave}>
                {/* Основные поля */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Название *</label>
                    <input
                      name="name"
                      defaultValue={restaurant.name}
                      required
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Категория *</label>
                    <select
                      name="category"
                      defaultValue={restaurant.category}
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    >
                      <option value="restaurant">🍽️ Ресторан</option>
                      <option value="cafe">☕ Кофе</option>
                      <option value="street_food">🌮 Street Food</option>
                      <option value="bar">🍺 Бар</option>
                      <option value="bakery">🥐 Пекарня</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Рейтинг *</label>
                    <input
                      name="rating"
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      defaultValue={restaurant.rating}
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Средний чек *</label>
                    <input
                      name="avg_check"
                      type="number"
                      min="0"
                      step="100"
                      defaultValue={restaurant.avg_check}
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Адрес *</label>
                    <input
                      name="address"
                      defaultValue={restaurant.address}
                      required
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Телефон *</label>
                    <input
                      name="phone"
                      defaultValue={restaurant.phone}
                      required
                      className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    />
                  </div>
                </div>

                {/* === ↓↓↓ НОВОЕ ПОЛЕ: ГОРОД ↓↓↓ === */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Город <span className="text-error">*</span>
                  </label>
                  <select
                    name="city"
                    defaultValue={restaurant.city || "Astana"}
                    className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                    required
                  >
                    <option value="Astana">🏙️ Астана</option>
                    <option value="Almaty">🏙️ Алматы</option>
                    <option value="Karaganda">🏙️ Караганда</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Выберите город, в котором находится ресторан
                  </p>
                </div>
                {/* === ↑↑↑ КОНЕЦ НОВОГО ПОЛЯ ↑↑↑ === */}

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Описание</label>
                  <textarea
                    name="description"
                    defaultValue={restaurant.description || ''}
                    rows={4}
                    className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                  />
                </div>

                {/* === ↓↓↓ ВСТАВЬТЕ ЭТОТ БЛОК КОДА ВМЕСТО СТАРОГО РАЗДЕЛА ФОТО ↓↓↓ === */}

                <div className="bg-gradient-to-br from-info-light to-info-light p-5 rounded-lg border-2 border-info/30">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📷</span> Фотографии ресторана
                  </h3>

                  {/* ЗОНА ПРЕДПРОСМОТРА */}
                  {(existingPhotos.length > 0 || photoPreviews.length > 0) && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Превью ({existingPhotos.length + selectedPhotos.length} фото)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 1. Рендер существующих фото */}
                        {existingPhotos.map((photoUrl) => (
                          <div key={photoUrl} className="relative group">
                            <img
                              src={photoUrl}
                              alt="Existing photo"
                              className="w-full h-24 object-cover rounded-lg border-2 border-input"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setExistingPhotos(existingPhotos.filter(p => p !== photoUrl));
                                setPhotosToDelete(prev => [...prev, photoUrl]);
                              }}
                              className="absolute top-1 right-1 bg-error hover:bg-error/90 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {/* 2. Рендер превью новых фото */}
                        {photoPreviews.map((previewUrl, index) => (
                          <div key={previewUrl} className="relative group">
                            <img
                              src={previewUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border-2 border-info"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                // Удаляем и файл, и его превью
                                setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
                                setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                                // Освобождаем память от превью
                                URL.revokeObjectURL(previewUrl);
                              }}
                              className="absolute top-1 right-1 bg-error hover:bg-error/90 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* КНОПКА ЗАГРУЗКИ */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Добавить новые фото
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="w-full border-2 border-dashed border-info/50 rounded-lg p-4 cursor-pointer hover:border-info transition"
                    />
                  </div>
                </div>

                {/* === ↑↑↑ КОНЕЦ БЛОКА ↑↑↑ === */}


                {/* Кухня */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Кухня *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      'Европейская', 'Итальянская', 'Азиатская', 'Японская',
                      'Русская', 'Грузинская', 'Узбекская', 'Мексиканская',
                      'Турецкая', 'Вегетарианская', 'Стейк-хаус', 'Бургеры',
                    ].map((c) => (
                      <label
                        key={c}
                        className="cursor-pointer block text-center border-2 border-input rounded-lg px-4 py-2.5 font-medium hover:border-warning transition"
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
                <div className="bg-gradient-to-br from-warning-light to-warning-light p-5 rounded-lg border-2 border-warning/30">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>⏰</span> Настройки акции
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Скидка *
                      </label>
                      <select
                        name="discount"
                        defaultValue={ts?.discount ?? 20}
                        className="w-full border-2 border-input rounded-lg p-3 font-semibold focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      >
                        <option value={50}>50% - Максимальная скидка</option>
                        <option value={40}>40% - Высокая скидка</option>
                        <option value={30}>30% - Средняя скидка</option>
                        <option value={20}>20% - Стандартная скидка</option>
                        <option value={10}>10% - Малая скидка</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Начало времени
                      </label>
                      <input
                        type="time"
                        name="time_start"
                        defaultValue={ts?.time_start?.slice(0, 5) || '15:00'}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Конец времени
                      </label>
                      <input
                        type="time"
                        name="time_end"
                        defaultValue={ts?.time_end?.slice(0, 5) || '22:00'}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Дата начала действия *
                      </label>
                      <input
                        type="date"
                        name="valid_from"
                        defaultValue={ts?.valid_from || ''}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Дата конца действия *
                      </label>
                      <input
                        type="date"
                        name="valid_to"
                        defaultValue={ts?.valid_to || ''}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Макс. столов
                      </label>
                      <input
                        type="number"
                        name="max_tables"
                        min={1}
                        defaultValue={ts?.max_tables || 4}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                  >
                    <Link href="/admin">
                      ✕ Отмена
                    </Link>
                  </Button>

                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 2: СКИДКИ */}
          <TabsContent value="discounts">
            <div className="bg-card rounded-xl shadow-md p-6 md:p-8 border border-border space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Управление скидками</h2>
                <Button
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
                >
                  ➕ Добавить скидку
                </Button>

              </div>

              {/* ФОРМА ДОБАВЛЕНИЯ */}
              {showDiscountForm && (
                <form onSubmit={handleSaveDiscount} className="p-4 bg-info-light rounded-lg border border-info/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Скидка *
                      </label>
                      <select
                        name="discount"
                        value={discountForm.discount}
                        onChange={(e) => setDiscountForm({ ...discountForm, discount: e.target.value })}
                        className="w-full border-2 border-input rounded-lg p-3 font-semibold focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      >
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="30">30%</option>
                        <option value="40">40%</option>
                        <option value="50">50%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Начало времени
                      </label>
                      <input
                        type="time"
                        value={discountForm.time_start}
                        onChange={(e) => setDiscountForm({ ...discountForm, time_start: e.target.value })}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Конец времени
                      </label>
                      <input
                        type="time"
                        value={discountForm.time_end}
                        onChange={(e) => setDiscountForm({ ...discountForm, time_end: e.target.value })}
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Дата начала действия *
                      </label>
                      <input
                        type="date"
                        value={discountForm.valid_from}
                        onChange={(e) => setDiscountForm({ ...discountForm, valid_from: e.target.value })}
                        required
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Дата конца действия *
                      </label>
                      <input
                        type="date"
                        value={discountForm.valid_to}
                        onChange={(e) => setDiscountForm({ ...discountForm, valid_to: e.target.value })}
                        required
                        className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={saving}
                    >
                      {editingDiscount ? '💾 Обновить' : '➕ Добавить'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDiscountForm(false);
                        setEditingDiscount(null);
                      }}
                    >
                      ✕ Отмена
                    </Button>

                  </div>
                </form>
              )}

              {/* СПИСОК СКИДОК */}
              {loadingDiscounts ? (
                <p className="text-sm text-muted-foreground">Загрузка скидок...</p>
              ) : discounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Скидки не добавлены</p>
              ) : (
                <div className="space-y-3">
                  {discounts.map((discount) => (
                    <div
                      key={discount.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold">{discount.discount}% скидка</p>
                        <p className="text-sm text-muted-foreground">
                          {discount.time_start} - {discount.time_end} · {discount.valid_from} до {discount.valid_to}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDiscount(discount);
                            setDiscountForm({
                              discount: String(discount.discount),
                              time_start: discount.time_start,
                              time_end: discount.time_end,
                              valid_from: discount.valid_from,
                              valid_to: discount.valid_to,
                              description: discount.description || 'на все меню',
                            });
                            setShowDiscountForm(true);
                          }}
                        >
                          ✏️ Изменить
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDiscount(discount.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
