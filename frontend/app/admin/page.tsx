'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';

const API_BASE = 'http://localhost:8000/api';

type Restaurant = {
  id: number;
  name: string;
  category: string;
  rating: number | null;
  avg_check: number | null;
  address: string | null;
  phone: string | null;
  discount?: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);


  const loadRestaurants = async () => {
    try {
      setLoadingList(true);
      setErrorList('');
      const res = await fetch(`${API_BASE}/restaurants`);
      if (!res.ok) throw new Error('Failed to load restaurants');
      const data = (await res.json()) as Restaurant[];
      setRestaurants(data);
    } catch (e) {
      console.error(e);
      setErrorList('Ошибка при загрузке списка ресторанов');
    } finally {
      setLoadingList(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    setSelectedPhotos(files);
    
    // Создаем превью
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


        try {
      setUploadingPhotos(true);
      const res = await fetch(`${API_BASE}/restaurants/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error('create_restaurant error:', err);
        alert(`Ошибка при создании ресторана: ${err?.detail || JSON.stringify(err)}`);
        return;
      }
      // ✅ ДОБАВЬ ЛОГИРОВАНИЕ:
      const data = await res.json();
      console.log('✅ Restaurant created successfully:', data);
      alert('✅ Ресторан успешно добавлен!');

      alert('✅ Ресторан успешно создан с фото!');
      form.reset();
      setSelectedPhotos([]);
      setPhotoPreview([]);
      await loadRestaurants();
    } catch (error) {
      console.error(error);
      alert('Ошибка сети при создании ресторана');
    } finally {
      setUploadingPhotos(false);
    }

  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Удалить ресторан ID ${id}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/restaurants/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Ошибка при удалении: ${err?.detail || res.status}`);
        return;
      }

      await loadRestaurants();
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при удалении ресторана');
    }
  };

  const handleQuickEdit = async (r: Restaurant) => {
    const newName = prompt('Новое название ресторана', r.name);
    if (!newName || newName === r.name) return;

    try {
      const res = await fetch(`${API_BASE}/restaurants/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Ошибка при обновлении: ${err?.detail || res.status}`);
        return;
      }

      await loadRestaurants();
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при обновлении ресторана');
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  return (
  <div className="container mx-auto max-w-6xl px-4 py-8">
    <Breadcrumbs items={[
      { label: 'Админ', href: '/admin' },
      { label: 'Управление ресторанами' }
    ]} />
    {/* PAGE TITLE */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
        ➕ Добавить ресторан
      </h1>
      <p className="text-lg text-muted-foreground">Управление списком ресторанов и акциями</p>
    </div>

    {/* Add Restaurant Form */}

      <div className="bg-white rounded-xl shadow-md p-6 md:p-8 mb-8 border border-gray-200">

        {/* Add Restaurant Form */}
        
          <form
            id="addRestaurantForm"
            className="space-y-6"
            onSubmit={handleCreateRestaurant}
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название ресторана <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
                  placeholder="Pizza House"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Категория <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Рейтинг <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="rating"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={5.0}
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Средний чек (₸) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="avg_check"
                  required
                  min={0}
                  step={100}
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
                  placeholder="1500"
                />
              </div>
            </div>

            {/* Cuisine Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Кухня (выберите несколько) <span className="text-red-500">*</span>
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
                    className="cursor-pointer block text-center border-2 border-gray-300 rounded-lg px-4 py-2.5 font-medium hover:border-purple-400 transition"
                  >
                    <input type="checkbox" name="cuisine" value={label} className="hidden" />
                    <span>
                      {emoji} {label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Выберите минимум 1 тип кухни</p>
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Адрес <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
                  placeholder="ул. Пушкина, 10, Алматы"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none"
                  placeholder="+7 777 123 4567"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
              <textarea
                name="description"
                rows={4}
                className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 transition outline-none resize-none"
                placeholder="Краткое описание ресторана, особенности, атмосфера..."
              />
            </div>

            {/* Photo Upload */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📷</span> Загрузить фото ресторана
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Выберите фото (можно несколько)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="w-full border-2 border-dashed border-blue-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Поддерживаются: JPG, PNG, WebP. Максимум 10 МБ на файл.
                </p>
              </div>

              {/* Photo Preview */}
              {photoPreview.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Превью ({photoPreview.length} фото)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photoPreview.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhotos = selectedPhotos.filter((_, i) => i !== idx);
                            const newPreviews = photoPreview.filter((_, i) => i !== idx);
                            setSelectedPhotos(newPhotos);
                            setPhotoPreview(newPreviews);
                          }}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


            {/* Discount & Time Settings */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-5 rounded-lg border-2 border-pink-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>⏰</span> Настройки акции
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Скидка <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="discount"
                    required
                    defaultValue="20"
                    className="w-full border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 rounded-lg p-3 transition outline-none text-lg font-bold"
                  >
                    <option value="10">🔥 10%</option>
                    <option value="20">🔥 20%</option>
                    <option value="30">🔥 30%</option>
                    <option value="40">🔥 40%</option>
                    <option value="50">🔥 50%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Начало времени
                  </label>
                  <input
                    type="time"
                    name="time_start"
                    defaultValue="15:00"
                    className="w-full border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 rounded-lg p-3 transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Конец времени
                  </label>
                  <input
                    type="time"
                    name="time_end"
                    defaultValue="22:00"
                    className="w-full border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 rounded-lg p-3 transition outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата начала действия <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    required
                    className="w-full border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 rounded-lg p-3 transition outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    С какой даты начинает действовать скидка
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата конца действия <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    required
                    className="w-full border-2 border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 rounded-lg p-3 transition outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    До какой даты действует скидка
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-pink-100 rounded-lg border border-pink-300">
                <p className="text-sm text-pink-800">
                  💡 <strong>Пример:</strong> Скидка 40% работает с 15:30 до 22:00 каждый день с 4 января
                  по 3 февраля
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg transition shadow-sm"
              >
                Сохранить ресторан
              </button>
            </div>
          </form>
        </div>

        {/* Restaurant List */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Список ресторанов</h2>
            <button
              onClick={loadRestaurants}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Обновить
            </button>
          </div>

          {loadingList && (
            <p className="text-sm text-gray-500 mt-4">Загрузка ресторанов...</p>
          )}

          {errorList && (
            <p className="text-sm text-red-500 mt-4">{errorList}</p>
          )}

          {!loadingList && !errorList && restaurants.length === 0 && (
            <div className="mt-6 p-6 border border-dashed border-gray-300 rounded-lg text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="font-semibold mb-1">Рестораны пока не добавлены</p>
              <p className="text-sm text-gray-500">
                Заполните форму выше, чтобы добавить первый ресторан
              </p>
            </div>
          )}

          {!loadingList && restaurants.length > 0 && (
            <div className="mt-6 space-y-3">
              {restaurants.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {r.category}
                      </span>
                      {r.rating && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          ⭐ {r.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.address || 'Адрес не указан'} · {r.phone || 'Телефон не указан'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.avg_check && (
                      <span className="text-xs text-gray-600">
                        💰 {r.avg_check} ₸
                      </span>
                    )}
                    <button
  className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
  onClick={() => router.push(`/admin/restaurants/${r.id}`)}
>
  Редактировать
</button>
                    <button
                      className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                      onClick={() => handleDelete(r.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  
  );
}
