'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/context/AuthContext';

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

export default function PartnerRestaurantEditPage() {
  const router = useRouter();
  const { user } = useAuth();

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
  
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length === 0) return;

    setSelectedPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.currentTarget.value = '';
  };

  // 🔑 КЛЮЧЕВОЕ ОТЛИЧИЕ: Загружаем ресторан партнера БЕЗ ID
  useEffect(() => {
    const load = async () => {
      console.log('🔍 START: Загружаем ресторан партнера');
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/restaurants/partner/${user?.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('📡 Ответ от API:', res.status, res.ok);

        if (!res.ok) {
          if (res.status === 404) {
            setError('У вас нет ресторана');
            setToast({ message: 'У вас нет ресторана', type: 'error' });
            return;
          }
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
        setToast({ message: 'Ошибка при загрузке ресторана', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      load();
    }
  }, [user?.id]);

  // Загрузить скидки
  useEffect(() => {
    if (!restaurant?.id) return;

    const loadDiscounts = async () => {
      try {
        setLoadingDiscounts(true);
        const res = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurant.id}`);
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
  }, [restaurant?.id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);

    const formData = new FormData(e.currentTarget);

    formData.delete('cuisine');
    const cuisines = Array.from(e.currentTarget.querySelectorAll('input[name="cuisine"]:checked'))
      .map(el => (el as HTMLInputElement).value);
    formData.append('cuisine', JSON.stringify(cuisines));

    selectedPhotos.forEach((photo) => {
      formData.append('photos', photo);
    });

    formData.append('photos_to_delete', JSON.stringify(photosToDelete));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/restaurants/${restaurant.id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }));
        throw new Error(err.detail || 'Не удалось обновить ресторан');
      }

      setToast({ message: '✅ Ресторан успешно обновлен!', type: 'success' });

      setTimeout(() => {
        router.push('/partner');
      }, 2000);

    } catch (e) {
      console.error(e);
      setToast({ message: `❌ Ошибка: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!discountForm.discount || !discountForm.time_start || !discountForm.time_end || !discountForm.valid_from || !discountForm.valid_to) {
      setToast({ message: '❌ Заполните все обязательные поля', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('restaurant_id', String(restaurant?.id));
      formData.append('service_id', serviceId || '');
      formData.append('discount', String(discountForm.discount || '10'));
      formData.append('time_start', discountForm.time_start);
      formData.append('time_end', discountForm.time_end);
      formData.append('valid_from', discountForm.valid_from);
      formData.append('valid_to', discountForm.valid_to);
      formData.append('description', discountForm.description);

      const token = localStorage.getItem('token');
      const method = editingDiscount ? 'PUT' : 'POST';
      const url = editingDiscount
        ? `${API_BASE}/bookings/discount_rules/${editingDiscount.id}`
        : `${API_BASE}/bookings/discount_rules`;

      const res = await fetch(url, {
        method,
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const reloadRes = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurant?.id}`);
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/discount_rules/${discountId}?restaurant_id=${restaurant?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete discount');

      setToast({ message: '✅ Скидка удалена!', type: 'success' });

      const reloadRes = await fetch(`${API_BASE}/bookings/discount_rules?restaurant_id=${restaurant?.id}`);
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-warning-light via-white to-warning-light min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-warning-light">
            <div className="mb-6">
              <div className="inline-block relative">
                <div className="text-7xl animate-pulse">🍽️</div>
                <div className="absolute inset-0 animate-spin rounded-full h-20 w-20 border-2 border-transparent border-t-pink-500 border-r-pink-500"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Загружаем ресторан</h2>
            <p className="text-muted-foreground mb-6">Сейчас покажем вам все детали...</p>
            <div className="w-full bg-gray-50 rounded-full h-1 overflow-hidden">
              <div className="bg-gradient-to-r from-warning to-rose-500 h-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="bg-gradient-to-br from-error-light to-warning-light min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-error-light">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ресторан не найден</h2>
            <p className="text-muted-foreground mb-6">{error || 'К сожалению, этого ресторана больше нет'}</p>
            <Link
              href="/partner"
              className="inline-block bg-gradient-to-r from-warning to-rose-500 hover:from-warning/90 hover:to-warning/90 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              ← Вернуться в личный кабинет
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ts = restaurant.timeslots?.[0];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs items={[
          { label: 'Партнер', href: '/partner' },
          { label: 'Управление' }
        ]} />

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-6">✏️ Редактировать ресторан</h1>
            <p className="text-muted-foreground">ID: {restaurant.id}</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="info">Информация</TabsTrigger>
            <TabsTrigger value="discounts">Скидки ({discounts.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: ИНФОРМАЦИЯ */}
          <TabsContent value="info">
            <div className="bg-card rounded-xl shadow-md p-6 md:p-8 border border-border">
              <form className="space-y-6" onSubmit={handleSave}>
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

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Описание</label>
                  <textarea
                    name="description"
                    defaultValue={restaurant.description || ''}
                    rows={4}
                    className="w-full border-2 border-input rounded-lg p-3 focus:border-warning focus:ring-2 focus:ring-warning/20 transition outline-none"
                  />
                </div>

                <div className="bg-gradient-to-br from-info-light to-info-light p-5 rounded-lg border-2 border-info/30">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📷</span> Фотографии ресторана
                  </h3>

                  {(existingPhotos.length > 0 || photoPreviews.length > 0) && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Превью ({existingPhotos.length + selectedPhotos.length} фото)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingPhotos.map((photoUrl) => (
                          <div key={photoUrl} className="relative group">
                            <img
                              src={photoUrl}
                              alt="Restaurant"
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setExistingPhotos(existingPhotos.filter(p => p !== photoUrl));
                                setPhotosToDelete([...photosToDelete, photoUrl]);
                              }}
                              className="absolute top-1 right-1 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {photoPreviews.map((preview, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={preview}
                              alt="Preview"
                              className="w-full h-24 object-cover rounded-lg border-2 border-success"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
                                setSelectedPhotos(selectedPhotos.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-1 right-1 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-info rounded-lg p-6 text-center hover:bg-info/5 transition">
                      <p className="text-sm font-semibold text-foreground">📸 Нажмите для загрузки фото</p>
                      <p className="text-xs text-muted-foreground">Поддерживаются JPG, PNG, WebP (макс 10 МБ)</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Кухня</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Европейская', 'Азиатская', 'Американская', 'Итальянская', 'Японская', 'Казахская'].map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="cuisine"
                          value={c}
                          defaultChecked={restaurant.cuisine?.includes(c)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <Button variant="outline" asChild>
                    <Link href="/partner">Отмена</Link>
                  </Button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg text-lg"
                  >
                    {saving ? '⏳ Сохранение...' : '✅ Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 2: СКИДКИ */}
          <TabsContent value="discounts">
            <div className="bg-card rounded-xl shadow-md p-6 md:p-8 border border-border">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Скидки и акции</h2>
                <button
                  onClick={() => setShowDiscountForm(!showDiscountForm)}
                  className="bg-success text-white px-4 py-2 rounded-lg hover:bg-success/90 transition font-semibold"
                >
                  + Добавить скидку
                </button>
              </div>

              {showDiscountForm && (
                <form onSubmit={handleSaveDiscount} className="mb-6 p-4 bg-background rounded-lg border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Скидка (%)</label>
                      <input
                        type="number"
                        value={discountForm.discount}
                        onChange={(e) => setDiscountForm({...discountForm, discount: e.target.value})}
                        min="0"
                        max="100"
                        className="w-full border-2 border-input rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Начало времени</label>
                      <input
                        type="time"
                        value={discountForm.time_start}
                        onChange={(e) => setDiscountForm({...discountForm, time_start: e.target.value})}
                        className="w-full border-2 border-input rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Конец времени</label>
                      <input
                        type="time"
                        value={discountForm.time_end}
                        onChange={(e) => setDiscountForm({...discountForm, time_end: e.target.value})}
                        className="w-full border-2 border-input rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Дата начала</label>
                      <input
                        type="date"
                        value={discountForm.valid_from}
                        onChange={(e) => setDiscountForm({...discountForm, valid_from: e.target.value})}
                        className="w-full border-2 border-input rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Дата конца</label>
                      <input
                        type="date"
                        value={discountForm.valid_to}
                        onChange={(e) => setDiscountForm({...discountForm, valid_to: e.target.value})}
                        className="w-full border-2 border-input rounded-lg p-3"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-success text-white px-4 py-2 rounded-lg hover:bg-success/90 disabled:opacity-50 font-semibold"
                    >
                      {editingDiscount ? 'Обновить' : 'Добавить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiscountForm(false);
                        setEditingDiscount(null);
                      }}
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 font-semibold"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}

              {loadingDiscounts ? (
                <p>⏳ Загрузка скидок...</p>
              ) : discounts.length === 0 ? (
                <p className="text-gray-500">Нет скидок</p>
              ) : (
                <div className="space-y-2">
                  {discounts.map((discount) => (
                    <div key={discount.id} className="flex justify-between items-center p-4 bg-background rounded-lg border border-border hover:shadow-md transition">
                      <div>
                        <p className="font-semibold">{discount.discount}% - {discount.time_start} до {discount.time_end}</p>
                        <p className="text-sm text-gray-500">{discount.valid_from} - {discount.valid_to}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
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
                          className="bg-warning text-white px-3 py-1 rounded text-sm hover:bg-warning/90 font-semibold"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(discount.id)}
                          className="bg-error text-white px-3 py-1 rounded text-sm hover:bg-error/90 font-semibold"
                        >
                          Удалить
                        </button>
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
