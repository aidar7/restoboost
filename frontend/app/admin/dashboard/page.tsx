// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, Users, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { CheckCircle, Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';



// API URL из переменных окружения
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Booking {
    id: number;
    guest_name?: string;
    guest_phone?: string;
    guest_email?: string;
    restaurant_id: number;
    restaurant_name?: string;
    booking_datetime?: string;
    party_size?: number;
    discount_applied?: number;
    status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    special_requests?: string;
    created_at?: string;
    completed_at?: string;
}

interface Restaurant {
    id: number;
    name: string;
}

interface Statistics {
    total: number;
    today_count: number;
    week_count: number;
    total_guests: number;
}

export default function DashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [stats, setStats] = useState<Statistics>({
        total: 0,
        today_count: 0,
        week_count: 0,
        total_guests: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
    const [completedStats, setCompletedStats] = useState({
    totalVisits: 0,
    totalGuests: 0,
    avgDiscount: 0
});

    // Фильтры
    const [filterRestaurant, setFilterRestaurant] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Модальное окно
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        fetchData();
        fetchCompletedBookings();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📡 Fetching from:', API_URL);

            const [bookingsRes, restaurantsRes] = await Promise.all([
                fetch(`${API_URL}/api/bookings/`),
                fetch(`${API_URL}/api/restaurants/`)
            ]);

            if (!bookingsRes.ok || !restaurantsRes.ok) {
                throw new Error('Failed to fetch data from API');
            }

            let bookingsData = await bookingsRes.json();
            let restaurantsData = await restaurantsRes.json();

            console.log('📦 Data received:', {
                bookings: typeof bookingsData,
                restaurants: typeof restaurantsData
            });

            // ✅ ЗАЩИТА: Извлекаем массив из любой структуры
            const bookingsArray = Array.isArray(bookingsData)
                ? bookingsData
                : (bookingsData?.bookings || bookingsData?.data || []);

            const restaurantsArray = Array.isArray(restaurantsData)
                ? restaurantsData
                : (restaurantsData?.restaurants || restaurantsData?.data || []);

            console.log('✅ Arrays extracted:', {
                bookings: bookingsArray.length,
                restaurants: restaurantsArray.length
            });

            // Добавляем названия ресторанов к броням
            const bookingsWithRestaurants = bookingsArray.map((b: Booking) => {
                const restaurant = restaurantsArray.find((r: Restaurant) => r.id === b.restaurant_id);
                return {
                    ...b,
                    restaurant_name: restaurant?.name || 'Не указан'
                };
            });

            setBookings(bookingsWithRestaurants);
            setRestaurants(restaurantsArray);
            calculateStats(bookingsWithRestaurants);

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    // НОВАЯ ФУНКЦИЯ ПОСЛЕ fetchData
const fetchCompletedBookings = async () => {
    try {
        const response = await fetch(`${API_URL}/api/bookings/completed`);
        if (response.ok) {
            const data = await response.json();
            setCompletedBookings(data);
            
            // Расчёт статистики
            const visits = data.length;
            const guests = data.reduce((sum: number, b: Booking) => sum + (b.party_size || 0), 0);
            const discount = data.reduce((sum: number, b: Booking) => sum + (b.discount_applied || 0), 0) / (visits || 1);
            
            setCompletedStats({ totalVisits: visits, totalGuests: guests, avgDiscount: Math.round(discount) });
        }
    } catch (error) {
        console.error('Error fetching completed bookings:', error);
    }
};


    const calculateStats = (bookingsData: Booking[]) => {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const todayBookings = bookingsData.filter(b =>
            b.booking_datetime?.startsWith(today)
        );

        const weekBookings = bookingsData.filter(b =>
            b.booking_datetime && b.booking_datetime >= weekAgo
        );

        const totalGuests = bookingsData.reduce((sum, b) => sum + (b.party_size || 0), 0);

        setStats({
            total: bookingsData.length,
            today_count: todayBookings.length,
            week_count: weekBookings.length,
            total_guests: totalGuests
        });
    };

    // 📊 Данные для графика "Брони за последние 7 дней"
    const getBookingsByDayData = () => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dateBookings = bookings.filter(b => b.booking_datetime?.startsWith(date));
            const guests = dateBookings.reduce((sum, b) => sum + (b.party_size || 0), 0);

            const dateObj = new Date(date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('ru-RU', { month: 'short' });

            return {
                date: `${day} ${month}`,
                bookings: dateBookings.length,
                guests: guests
            };
        });
    };

    // 📊 Данные для графика "Топ ресторанов"
    const getTopRestaurantsData = () => {
        const restaurantBookings = restaurants.map(restaurant => {
            const count = bookings.filter(b => b.restaurant_id === restaurant.id).length;
            return {
                name: restaurant.name.length > 20 ? restaurant.name.substring(0, 20) + '...' : restaurant.name,
                bookings: count
            };
        });

        return restaurantBookings
            .filter(r => r.bookings > 0)
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 5);
    };

    // 📊 Данные для графика "Статусы броней"
    const getBookingStatusData = () => {
        const statuses = [
            { name: 'Подтверждено', value: bookings.filter(b => (b.status || 'confirmed') === 'confirmed').length, color: '#10b981' },
            { name: 'Завершено', value: bookings.filter(b => b.status === 'completed').length, color: '#3b82f6' },
            { name: 'Отменено', value: bookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' },
            { name: 'Не пришли', value: bookings.filter(b => b.status === 'no_show').length, color: '#f59e0b' }
        ];

        return statuses.filter(s => s.value > 0);
    };


    const filteredBookings = bookings.filter(booking => {
        if (filterRestaurant && filterRestaurant !== 'all' && !booking.restaurant_name?.toLowerCase().includes(filterRestaurant.toLowerCase())) {
            return false;
        }
        if (filterStatus && filterStatus !== 'all' && booking.status !== filterStatus) {
            return false;
        }
        if (filterDateFrom && booking.booking_datetime && booking.booking_datetime < filterDateFrom) {
            return false;
        }
        if (filterDateTo && booking.booking_datetime && booking.booking_datetime > filterDateTo) {
            return false;
        }
        return true;
    });

    const updateStatus = async (bookingId: number, newStatus: string) => {
        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setBookings(prev => prev.map(b =>
                    b.id === bookingId ? { ...b, status: newStatus as any } : b
                ));
                console.log('✅ Status updated:', bookingId, newStatus);
            } else {
                console.error('❌ Failed to update status');
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    };

    const deleteBooking = async (bookingId: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту бронь?')) return;

        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setBookings(prev => prev.filter(b => b.id !== bookingId));
                // Пересчитываем статистику
                const updatedBookings = bookings.filter(b => b.id !== bookingId);
                calculateStats(updatedBookings);
                console.log('✅ Booking deleted:', bookingId);
            } else {
                console.error('❌ Failed to delete booking');
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Гость', 'Ресторан', 'Телефон', 'Email', 'Дата/Время', 'Гостей', 'Скидка', 'Статус'];
        const rows = filteredBookings.map(b => [
            b.id,
            b.guest_name || '',
            b.restaurant_name || '',
            b.guest_phone || '',
            b.guest_email || '',
            b.booking_datetime || '',
            b.party_size || 2,
            b.discount_applied || 0,
            b.status || 'confirmed'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `restoboost_bookings_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        console.log('✅ CSV exported:', filteredBookings.length, 'bookings');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-2xl font-bold mb-2">Загрузка...</div>
                    <p className="text-sm text-muted-foreground">Получение данных из API</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-6xl">⚠️</div>
                <div className="text-2xl font-bold text-red-600">Ошибка загрузки</div>
                <p className="text-muted-foreground max-w-md text-center">{error}</p>
                <div className="flex gap-2">
                    <Button onClick={fetchData}>Попробовать снова</Button>
                    <Button variant="outline" asChild>
                        <Link href="/">На главную</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
    <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
      { label: 'Админ', href: '/admin' },
      { label: 'Дашборд' }
    ]} />
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            📊 Аналитика дашборда
        </h1>
        <p className="text-lg text-muted-foreground">Статистика бронирований и посещений</p>
        </div>

    {/* твои карточки KPI */}


            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-6 md:gap-8">
                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Всего броней
                            </CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">
                                Общее количество бронирований
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Сегодня
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.today_count}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.today_count > 0 ? (
                                    <span className="text-green-600">↑ Активные брони</span>
                                ) : (
                                    'Нет броней на сегодня'
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                На неделе
                            </CardTitle>
                            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.week_count}</div>
                            <p className="text-xs text-muted-foreground">
                                За последние 7 дней
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Всего гостей
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_guests}</div>
                            <p className="text-xs text-muted-foreground">
                                Суммарно по всем броням
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Подтверждено посещений</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{completedStats.totalVisits}</div>
                            <p className="text-xs text-muted-foreground">Завершённые брони</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Гостей обслужено</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{completedStats.totalGuests}</div>
                            <p className="text-xs text-muted-foreground">По завершённым</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Средняя скидка</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">-{completedStats.avgDiscount}%</div>
                            <p className="text-xs text-muted-foreground">По завершённым</p>
                        </CardContent>
                    </Card>

                </div>


                {/* Charts Row - как в shadcn dashboard */}
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {/* Брони за 7 дней - занимает 3 колонки из 4 */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                    <CardTitle>Брони за последние 7 дней</CardTitle>
                    <CardDescription>
                        Динамика бронирований и количества гостей
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                    <ChartContainer
                        config={{
                        bookings: {
                            label: "Броней",
                            color: "var(--chart-1)",  // Другой цвет из палитры
                        },
                        guests: {
                            label: "Гостей",
                            color: "oklch(var(--chart-4))",
                        },
                        }}
                        className="aspect-auto h-[250px] w-full"
                    >
                        <AreaChart data={getBookingsByDayData()}>
                        <defs>
                            <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor="var(--color-bookings)"
                                stopOpacity={0.8}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--color-bookings)"
                                stopOpacity={0.1}
                            />
                            </linearGradient>
                            <linearGradient id="fillGuests" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor="var(--color-guests)"
                                stopOpacity={0.8}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--color-guests)"
                                stopOpacity={0.1}
                            />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={(props: any) => <ChartTooltipContent {...props} indicator="dot" />}
                        />
                        <Area
                            dataKey="guests"
                            type="natural"
                            fill="url(#fillGuests)"
                            fillOpacity={0.4}
                            stroke="var(--color-guests)"
                            stackId="a"
                        />
                        <Area
                            dataKey="bookings"
                            type="natural"
                            fill="url(#fillBookings)"
                            fillOpacity={0.4}
                            stroke="var(--color-bookings)"
                            stackId="a"
                        />
                        </AreaChart>
                    </ChartContainer>
                    </CardContent>
                </Card>

                {/* Топ ресторанов - занимает 1 колонку */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                    <CardTitle>Топ рестораны</CardTitle>
                    <CardDescription>
                        По количеству броней
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer
                        config={{
                        bookings: {
                            label: "Броней",
                            color: "hsl(var(--chart-1))",
                        },
                        }}
                        className="aspect-auto h-[250px] w-full"
                    >
                        <BarChart
                        data={getTopRestaurantsData()}
                        layout="vertical"
                        margin={{
                            left: 0,
                        }}
                        >
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 15)}
                        />
                        <XAxis type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={(props: any) => <ChartTooltipContent {...props} hideLabel />}
                        />
                        <Bar 
                            dataKey="bookings" 
                            fill="var(--color-bookings)" 
                            radius={5}
                        />
                        </BarChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
                </div>





                {/* Filters Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Фильтры</CardTitle>
                        <CardDescription>
                            Используйте фильтры для поиска конкретных бронирований
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="restaurant">Ресторан</Label>
                                <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
                                    <SelectTrigger id="restaurant">
                                        <SelectValue placeholder="Все рестораны" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все рестораны</SelectItem>
                                        {restaurants.map(r => (
                                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Статус</Label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Все статусы" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все статусы</SelectItem>
                                        <SelectItem value="confirmed">Подтверждено</SelectItem>
                                        <SelectItem value="cancelled">Отменено</SelectItem>
                                        <SelectItem value="completed">Завершено</SelectItem>
                                        <SelectItem value="no_show">Не пришли</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateFrom">Дата от</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateTo">Дата до</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilterRestaurant('');
                                    setFilterStatus('');
                                    setFilterDateFrom('');
                                    setFilterDateTo('');
                                }}
                            >
                                Сбросить
                            </Button>
                            <Button onClick={exportToCSV} className="ml-auto">
                                📥 Экспорт CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Bookings Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Список броней</CardTitle>
                        <CardDescription>
                            Всего найдено: {filteredBookings.length} бронирований
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Гость</TableHead>
                                    <TableHead>Ресторан</TableHead>
                                    <TableHead>Телефон</TableHead>
                                    <TableHead>Дата/Время</TableHead>
                                    <TableHead>Гостей</TableHead>
                                    <TableHead>Скидка</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBookings.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell className="font-mono text-xs">
                                            #{booking.id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {booking.guest_name || 'Не указано'}
                                        </TableCell>
                                        <TableCell>{booking.restaurant_name}</TableCell>
                                        <TableCell>
                                            <a
                                                href={`tel:${booking.guest_phone}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {booking.guest_phone || 'Не указан'}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {booking.booking_datetime?.substring(0, 16).replace('T', ' ') || '-'}
                                        </TableCell>
                                        <TableCell>{booking.party_size || 2}</TableCell>
                                        <TableCell>
                                            {booking.discount_applied ? (
                                                <Badge variant="secondary">-{booking.discount_applied}%</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={booking.status || 'confirmed'}
                                                onValueChange={(value) => updateStatus(booking.id, value)}
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="confirmed">✅ Подтверждено</SelectItem>
                                                    <SelectItem value="cancelled">❌ Отменено</SelectItem>
                                                    <SelectItem value="completed">✔️ Завершено</SelectItem>
                                                    <SelectItem value="no_show">⚠️ Не пришли</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedBooking(booking)}
                                                >
                                                    👁️ Подробнее
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteBooking(booking.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    🗑️ Удалить
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {filteredBookings.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">Нет броней</h3>
                                <p className="text-sm text-muted-foreground">
                                    {bookings.length === 0
                                        ? 'Пока нет бронирований в системе'
                                        : 'По заданным фильтрам ничего не найдено'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Modal для деталей брони (добавь позже) */}
            {selectedBooking && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setSelectedBooking(null)}
                >
                    <Card className="w-full max-w-2xl m-4" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <CardTitle>Детали брони #{selectedBooking.id}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Гость</Label>
                                    <p className="text-sm font-semibold">{selectedBooking.guest_name}</p>
                                </div>
                                <div>
                                    <Label>Телефон</Label>
                                    <p className="text-sm">{selectedBooking.guest_phone}</p>
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <p className="text-sm">{selectedBooking.guest_email || '—'}</p>
                                </div>
                                <div>
                                    <Label>Ресторан</Label>
                                    <p className="text-sm font-semibold">{selectedBooking.restaurant_name}</p>
                                </div>
                                <div>
                                    <Label>Дата/Время</Label>
                                    <p className="text-sm">{selectedBooking.booking_datetime?.substring(0, 16).replace('T', ' ')}</p>
                                </div>
                                <div>
                                    <Label>Количество гостей</Label>
                                    <p className="text-sm">{selectedBooking.party_size}</p>
                                </div>
                                {selectedBooking.special_requests && (
                                    <div className="col-span-2">
                                        <Label>Особые пожелания</Label>
                                        <p className="text-sm">{selectedBooking.special_requests}</p>
                                    </div>
                                )}
                            </div>
                            <Button onClick={() => setSelectedBooking(null)} className="w-full">
                                Закрыть
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
