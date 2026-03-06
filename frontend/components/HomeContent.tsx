
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { API_BASE } from '@/lib/config';

// --- Типы и константы (без изменений) ---
interface Restaurant {
  id: number;
  name: string;
  category: string;
  rating: number;
  avg_check: number;
  address: string;
  photos: string[];
  cuisine: string[];
  timeslots?: Array<{ time: string; discount: number }>;
  popularity?: number;
}

const CATEGORIES = [
  { id: 'all', name: 'Все' },
  { id: 'restaurant', name: 'Рестораны' },
  { id: 'cafe', name: 'Кофе' },
  { id: 'street_food', name: 'Street Food' },
  { id: 'bar', name: 'Бары' },
  { id: 'bakery', name: 'Пекарни' },
];

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  street_food: '🌮',
  bar: '🍺',
  bakery: '🥐',
};

// --- Основной компонент ---
export default function Home() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search');

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // Для сортировки
  const [avgCheck, setAvgCheck] = useState('all');     // Для среднего чека

  const title = useMemo(() => {
    if (searchQuery) return `Результаты по запросу: "${searchQuery}"`;
    if (category === 'all') return 'Все рестораны';
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.name : 'Рестораны';
  }, [category, searchQuery]);

  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || '🍽️';

 // ↓↓↓ ЗАМЕНИТЕ ВАШ useEffect НА ЭТОТ ↓↓↓

useEffect(() => {
  const controller = new AbortController();

  const fetchRestaurants = async () => {
    // ИЗМЕНЕНИЕ 1: Сбрасываем состояния перед каждым новым запросом.
    // Это гарантирует, что мы всегда начинаем с чистого листа и показываем загрузчик.
    setError('');
    setRestaurants([]); // Устанавливаем пустой массив, а не null
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      } else if (category !== 'all') {
        params.append('category', category);
      }
       if (sortBy) {
        params.append('sort_by', sortBy);
      }

      // 2. Добавляем параметр среднего чека
      if (avgCheck && avgCheck !== 'all') {
        params.append('avg_check_filter', avgCheck);
      }
      
      const queryString = params.toString();
      const finalUrl = `${API_BASE}/api/restaurants${queryString ? `?${queryString}` : ''}`;

      console.log(`🚀 Fetching from: ${finalUrl}`);

      const res = await fetch(finalUrl, { signal: controller.signal, cache: 'no-store' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} (Status: ${res.status})`);
      }

      const data = (await res.json()) as Restaurant[];
      
      // ИЗМЕНЕНИЕ 2: Устанавливаем данные и СРАЗУ ЖЕ выключаем загрузку.
      // Атомарная операция для предотвращения гонки состояний.
      setRestaurants(data);
      setLoading(false);
      
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      // Если произошла ошибка, устанавливаем ошибку и выключаем загрузку.
      setError('Ошибка при загрузке ресторанов. Проверьте консоль.');
      setLoading(false);
      console.error("Fetch Error:", e);
    }
    // Блок finally больше не нужен.
  };

  fetchRestaurants();

  return () => {
    controller.abort();
  };
}, [category, searchQuery, sortBy, avgCheck]);


  return (
    <main className="container mx-auto px-4 py-8">
      {/* ... остальной JSX код без изменений ... */}
      {/* Категории */}
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              variant={category === cat.id ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              disabled={!!searchQuery}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Фильтры */}
      <div className="mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Сортировать по
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите сортировку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Популярности</SelectItem>
                    <SelectItem value="rating_desc">Рейтингу (убыв.)</SelectItem>
                    <SelectItem value="avg_check_asc">Среднему чеку (возр.)</SelectItem>
                    <SelectItem value="avg_check_desc">Среднему чеку (убыв.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Средний чек
                </label>
                <Select value={avgCheck} onValueChange={setAvgCheck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любой</SelectItem>
                    <SelectItem value="0-5000">до 5000 ₸</SelectItem>
                    <SelectItem value="5000-10000">5000-10000 ₸</SelectItem>
                    <SelectItem value="10000-15000">10000-15000 ₸</SelectItem>
                    <SelectItem value="15000+">от 15000 ₸</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Заголовок */}
      <h2 className="text-3xl font-bold mb-6">{title}</h2>

      {/* Состояния загрузки, ошибки и пустого списка */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg mb-4">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      {!loading && !error && restaurants.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold mb-2">Рестораны не найдены</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Попробуйте другой поисковый запрос' : 'Попробуйте изменить фильтры'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Сетка ресторанов */}
      {!loading && !error && restaurants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              getCategoryIcon={getCategoryIcon}
            />
          ))}
        </div>
      )}
    </main>
  );
}
