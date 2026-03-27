// app/partner/page.tsx - ПОЛНАЯ ВЕРСИЯ С ДАТАМИ
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/app/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

type Restaurant = {
  id: number;
  name: string;
  category: string;
  rating: number | null;
  avg_check: number | null;
  address: string | null;
  phone: string | null;
  city?: string;
  discount?: number | null;
  photos?: string[];
};

export default function PartnerPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  // Загрузить ресторан партнёра (только СВОЙ ресторан)
  const loadPartnerRestaurant = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        setError('Пользователь не авторизован');
        return;
      }

      const res = await fetch(`${API_BASE}/restaurants/partner/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('');
          setRestaurant(null);
          return;
        }
        throw new Error('Failed to load restaurant');
      }
      const data = (await res.json()) as Restaurant;
      setRestaurant(data);
    } catch (e) {
      console.error(e);
      setError('Ошибка при загрузке ресторана');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    setSelectedPhotos(files);

    const previews = files.map(file => URL.createObjectURL(file));
    setPhotoPreview(previews);
  };

  const handleCreateRestaurant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const formData = new FormData(form);

    // кухни в массив
    const cuisines = formData.getAll('cuisine') as string[];
    formData.delete('cuisine');
    formData.append('cuisine', JSON.stringify(cuisines));
    
    // Добавляем фото
    selectedPhotos.forEach((photo) => {
      formData.append('photos', photo);
    });

    // ✅ Добавляем owner_id партнёра (ВАЖНО!)
    if (user?.id) {
      formData.append('owner_id', user.id.toString());
    }

    try {
      setUploadingPhotos(true);
      const res = await fetch(`${API_BASE}/restaurants/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error('create_restaurant error:', err);
        alert(`Ошибка при создании ресторана: ${err?.detail || JSON.stringify(err)}`);
        return;
      }

      const data = await res.json();
      console.log('✅ Restaurant created successfully:', data);
      alert('✅ Ресторан успешно добавлен!');

      form.reset();
      setSelectedPhotos([]);
      setPhotoPreview([]);
      await loadPartnerRestaurant();
    } catch (error) {
      console.error(error);
      alert('Ошибка сети при создании ресторана');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDelete = async () => {
    if (!restaurant) return;
    if (!confirm(`Удалить ресторан "${restaurant.name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/restaurants/${restaurant.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Ошибка при удалении: ${err?.detail || res.status}`);
        return;
      }

      alert('✅ Ресторан успешно удалён!');
      await loadPartnerRestaurant();
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при удалении ресторана');
    }
  };

  const handleQuickEdit = async () => {
    if (!restaurant) return;
    
    const newName = prompt('Новое название ресторана', restaurant.name);
    if (!newName || newName === restaurant.name) return;

    try {
      const res = await fetch(`${API_BASE}/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Ошибка при обновлении: ${err?.detail || res.status}`);
        return;
      }

      await loadPartnerRestaurant();
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при обновлении ресторана');
    }
  };

  useEffect(() => {
    loadPartnerRestaurant();
  }, [user?.id, token]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Мой ресторан"
        breadcrumbs={[
          { label: 'Партнёр' },
          { label: 'Управление' }
        ]}
      />

      {/* Если ресторана нет - форма создания */}
      {!restaurant && (
        <div className="bg-card rounded-xl shadow-md p-6 md:p-8 mb-8 border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Добавить мой ресторан</h2>

          <form
            id="addRestaurantForm"
            className="space-y-6"
            onSubmit={handleCreateRestaurant}
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Название ресторана <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                  placeholder="Pizza House"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Категория <span className="text-error">*</span>
                </label>
                <select
                  name="category"
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                  required
                >
                  <option value="restaurant">🍽️ Ресторан</option>
                  <option value="cafe">☕ Кофе</option>
                  <option value="street_food">🌮 Street Food</option>
                  <option value="bar">🍺 Бар</option>
                  <option value="bakery">🥐 Пекарня</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Рейтинг <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  name="rating"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={5.0}
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Средний чек (₸) <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  name="avg_check"
                  required
                  min={0}
                  step={100}
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                  placeholder="1500"
                />
              </div>
            </div>

            {/* Город */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Город <span className="text-error">*</span>
              </label>
              <select
                name="city"
                defaultValue="Astana"
                className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
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

            {/* Cuisine Tags */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Кухня (выберите несколько) <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Европейская', '🍽️'],
                  ['Итальянская', '🍕'],
                  ['Азиатская', '🍜'],
                  ['Японская', '🍣'],
                  ['Русская', '🥟'],
                  ['Грузинская', '🥘'],
                  ['Узбекская', '🍛'],
                  ['Мексиканская', '🌮'],
                  ['Турецкая', '🥙'],
                  ['Вегетарианская', '🥗'],
                  ['Стейк-хаус', '🥩'],
                  ['Бургеры', '🍔'],
                ].map(([label, emoji], idx) => (
                  <label
                    key={idx}
                    className="cursor-pointer block text-center border-2 border-input rounded-lg px-4 py-2.5 font-medium hover:border-primary transition"
                  >
                    <input type="checkbox" name="cuisine" value={label} className="hidden" />
                    <span>
                      {emoji} {label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Выберите минимум 1 тип кухни</p>
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Адрес <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                  placeholder="ул. Пушкина, 10, Астана"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Телефон <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none"
                  placeholder="+7 777 123 4567"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Описание</label>
              <textarea
                name="description"
                rows={4}
                className="w-full border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-3 transition outline-none resize-none"
                placeholder="Краткое описание ресторана, особенности, атмосфера..."
              />
            </div>

            {/* Photo Upload */}
            <div className="bg-gradient-to-br from-info-light to-info-light/50 p-5 rounded-lg border-2 border-info/30">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>📷</span> Загрузить фото ресторана
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Выберите фото (можно несколько)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="w-full border-2 border-dashed border-info/50 rounded-lg p-4 cursor-pointer hover:border-info transition"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Поддерживаются: JPG, PNG, WebP. Максимум 10 МБ на файл.
                </p>
              </div>

              {/* Photo Preview */}
              {photoPreview.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Превью ({photoPreview.length} фото)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photoPreview.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-info/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhotos = selectedPhotos.filter((_, i) => i !== idx);
                            const newPreviews = photoPreview.filter((_, i) => i !== idx);
                            setSelectedPhotos(newPhotos);
                            setPhotoPreview(newPreviews);
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
            </div>

            {/* ✅ Discount & Time Settings */}
            <div className="bg-gradient-to-br from-warning-light to-warning-light/50 p-5 rounded-lg border-2 border-warning/30">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>⏰</span> Настройки акции
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Скидка <span className="text-error">*</span>
                  </label>
                  <select
                    name="discount"
                    required
                    defaultValue="20"
                    className="w-full border-2 border-input focus:border-warning focus:ring-2 focus:ring-warning/20 rounded-lg p-3 transition outline-none text-lg font-bold"
                  >
                    <option value="10">🔥 10%</option>
                    <option value="20">🔥 20%</option>
                    <option value="30">🔥 30%</option>
                    <option value="40">🔥 40%</option>
                    <option value="50">🔥 50%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Начало времени
                  </label>
                  <input
                    type="time"
                    name="time_start"
                    defaultValue="15:00"
                    className="w-full border-2 border-input focus:border-warning focus:ring-2 focus:ring-warning/20 rounded-lg p-3 transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Конец времени
                  </label>
                  <input
                    type="time"
                    name="time_end"
                    defaultValue="22:00"
                    className="w-full border-2 border-input focus:border-warning focus:ring-2 focus:ring-warning/20 rounded-lg p-3 transition outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Дата начала действия <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    required
                    className="w-full border-2 border-input focus:border-warning focus:ring-2 focus:ring-warning/20 rounded-lg p-3 transition outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    С какой даты начинает действовать скидка
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Дата конца действия <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    required
                    className="w-full border-2 border-input focus:border-warning focus:ring-2 focus:ring-warning/20 rounded-lg p-3 transition outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    До какой даты действует скидка
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-warning-light/50 rounded-lg border border-warning/30">
                <p className="text-sm text-warning">
                  💡 <strong>Пример:</strong> Скидка 40% работает с 15:30 до 22:00 каждый день с 4 января
                  по 3 февраля
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={uploadingPhotos}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold px-8 py-3 rounded-lg transition shadow-lg text-lg"
              >
                {uploadingPhotos ? '⏳ Загрузка...' : '✅ Создать ресторан'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Если ресторан есть - показываем его */}
      {restaurant && (
        <div className="bg-card rounded-xl shadow-md p-6 md:p-8 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Мой ресторан</h2>
            <button
              onClick={loadPartnerRestaurant}
              className="text-sm text-primary hover:text-primary/80 underline"
            >
              Обновить
            </button>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          )}

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          {!loading && restaurant && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-semibold">{restaurant.name}</span>
                    {restaurant.photos && restaurant.photos.length > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success-light text-success font-medium">
                        📷 Есть фото ({restaurant.photos.length})
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-error-light text-error font-medium">
                        📷 Нет фото
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{restaurant.category}</p>
                  <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickEdit}
                    className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                  >
                    ✏️ Редактировать
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 text-sm bg-error text-white rounded-lg hover:bg-error/90 transition"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
