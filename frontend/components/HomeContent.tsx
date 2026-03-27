
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { API_BASE } from '@/lib/config';
import { DiscountCardRow } from '@/components/DiscountCard';


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
// Для Hero показываем только активные категории (по факту в БД)
const HERO_CATEGORIES = CATEGORIES.filter(cat =>
  ['restaurant', 'cafe', 'bar'].includes(cat.id)
);


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

      {/* ===== НОВЫЙ HERO SECTION ===== */}
      <div className="rounded-3xl px-8 py-16 mb-12 relative overflow-hidden"
  style={{
    background: 'linear-gradient(135deg, oklch(0.52 0.14 165) 0%, oklch(0.62 0.14 165) 50%, oklch(0.48 0.12 215) 100%)'
  }}
>
        {/* Декоративные элементы */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Заголовок */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Скидки от 10 до 50%
          </h1>
          <p className="text-xl text-white/90 mb-8">
            на рестораны, кофе и доставку еды
          </p>

          {/* Кнопки категорий */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {HERO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${category === cat.id
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Фильтры в Hero */}
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48 bg-white text-black border-0">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 bg-white text-black border-0">
                <SelectValue placeholder="Кухня" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Популярные</SelectItem>
                <SelectItem value="rating_desc">По рейтингу</SelectItem>
              </SelectContent>
            </Select>

            <Select value={avgCheck} onValueChange={setAvgCheck}>
              <SelectTrigger className="w-full md:w-48 bg-white text-black border-0">
                <SelectValue placeholder="Средний чек" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любой</SelectItem>
                <SelectItem value="0-5000">до 5000 ₸</SelectItem>
                <SelectItem value="5000-10000">5000-10000 ₸</SelectItem>
                <SelectItem value="10000-15000">10000-15000 ₸</SelectItem>
                <SelectItem value="15000+">от 15000 ₸</SelectItem>
              </SelectContent>
            </Select>

            <Button className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold">
              Найти
            </Button>
          </div>
        </div>
      </div>

      {/* Заголовок "Категории со скидкой " */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">
          {category === 'all'
            ? 'Категории со скидкой'
            : `Скидки в категории: ${CATEGORIES.find(c => c.id === category)?.name || ''}`}
        </h2>
        <a href="#" className="text-purple-600 font-medium hover:underline">
          Все заведения →
        </a>
      </div>

      {/* Карточки со скидками */}
      <DiscountCardRow />

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
