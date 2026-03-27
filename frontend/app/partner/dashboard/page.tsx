// app/partner/dashboard/page.tsx
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
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/app/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

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

export default function PartnerDashboardPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
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
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Модальное окно
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetchData();
            fetchCompletedBookings();
        }
    }, [user?.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📡 Fetching partner data for user:', user?.id);

            // Получаем ресторан партнёра
            const restaurantRes = await fetch(`${API_BASE}/restaurants/partner/${user?.id}`);
            
            if (!restaurantRes.ok) {
                if (restaurantRes.status === 404) {
                    setError('У вас пока нет ресторана');
                    setRestaurant(null);
                    setBookings([]);
                    return;
                }
                throw new Error('Failed to fetch restaurant');
            }

            const restaurantData = await restaurantRes.json();
            setRestaurant(restaurantData);

            // Получаем брони только для этого ресторана
            const bookingsRes = await fetch(`${API_BASE}/bookings/restaurant/${restaurantData.id}`);
            
            if (!bookingsRes.ok) {
                throw new Error('Failed to fetch bookings');
            }

            let bookingsData = await bookingsRes.json();
            console.log('📦 Bookings data:', bookingsData);

            // ✅ ЗАЩИТА: Извлекаем массив из любой структуры
            const bookingsArray = Array.isArray(bookingsData)
                ? bookingsData
                : (bookingsData?.bookings || bookingsData?.data || []);

            // Добавляем название ресторана
            const bookingsWithRestaurant = bookingsArray.map((b: Booking) => ({
                ...b,
                restaurant_name: restaurantData.name
            }));

            setBookings(bookingsWithRestaurant);
            calculateStats(bookingsWithRestaurant);

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    // Загрузить завершённые брони
    const fetchCompletedBookings = async () => {
        try {
            if (!restaurant?.id) return;
            
            const response = await fetch(`${API_BASE}/bookings/restaurant/${restaurant.id}/completed`);
            if (response.ok) {
                const data = await response.json();
                const bookingsArray = Array.isArray(data) ? data : (data?.bookings || []);
                setCompletedBookings(bookingsArray);

                // Расчёт статистики
                const visits = bookingsArray.length;
                const guests = bookingsArray.reduce((sum: number, b: Booking) => sum + (b.party_size || 0), 0);
                const discount = bookingsArray.reduce((sum: number, b: Booking) => sum + (b.discount_applied || 0), 0) / (visits || 1);

                setCompletedStats({ totalVisits: visits, totalGuests: guests, avgDiscount: Math.round(discount) });
            }
        } catch (error) {
            console.error('Error fetching completed bookings:', error);
        }
    };

    const calculateStats = (bookingsData: Booking[]) => {
        // ✅ Правильный расчёт даты с учётом временной зоны
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const today = now.toISOString().split('T')[0];

        console.log('📅 Today date:', today);

        const todayBookings = bookingsData.filter(b => {
            return b.booking_datetime?.startsWith(today);
        });

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const weekBookings = bookingsData.filter(b =>
            b.booking_datetime && b.booking_datetime >= weekAgo
        );

        const totalGuests = bookingsData.reduce((sum, b) => sum + (b.party_size || 0), 0);

        console.log('✅ Stats calculated:', {
            total: bookingsData.length,
            today: todayBookings.length,
            week: weekBookings.length,
            guests: totalGuests
        });

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
            const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b));
            } else {
                alert('Ошибка при обновлении статуса');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Ошибка сети');
        }
    };

    const deleteBooking = async (bookingId: number) => {
        if (!confirm('Удалить бронирование?')) return;

        try {
            const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setBookings(bookings.filter(b => b.id !== bookingId));
            } else {
                alert('Ошибка при удалении');
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('Ошибка сети');
        }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Гость', 'Телефон', 'Дата/Время', 'Гостей', 'Скидка', 'Статус'];
        const rows = filteredBookings.map(b => [
            b.id,
            b.guest_name || '-',
            b.guest_phone || '-',
            b.booking_datetime?.substring(0, 16).replace('T', ' ') || '-',
            b.party_size || 2,
            b.discount_applied ? `-${b.discount_applied}%` : '-',
            b.status || 'confirmed'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_${restaurant?.name || 'export'}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <main className="container mx-auto px-4 py-8">
                <PageHeader
                    title="Мой дашборд"
                    breadcrumbs={[
                        { label: 'Партнёр' },
                        { label: 'Дашборд' }
                    ]}
                />
                <p className="text-center text-muted-foreground">Загрузка...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="container mx-auto px-4 py-8">
                <PageHeader
                    title="Мой дашборд"
                    breadcrumbs={[
                        { label: 'Партнёр' },
                        { label: 'Дашборд' }
                    ]}
                />
                <Card className="border-error/30 bg-error-light/10">
                    <CardContent className="pt-6">
                        <p className="text-error">{error}</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <PageHeader
            title={`Дашборд: ${restaurant?.name || 'Мой ресторан'}`}
            breadcrumbs={[
                { label: 'Партнёр' },
                { label: 'Дашборд' }
            ]}
        >
            <main className="container mx-auto px-4 py-8 space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Всего броней</CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.week_count} на этой неделе
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Сегодня</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.today_count}</div>
                            <p className="text-xs text-muted-foreground">
                                бронирований
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Всего гостей</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_guests}</div>
                            <p className="text-xs text-muted-foreground">
                                человек
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{completedStats.totalVisits}</div>
                            <p className="text-xs text-muted-foreground">
                                {completedStats.totalGuests} гостей
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-4">
                    {/* Брони за 7 дней - занимает 3 колонки */}
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
                                        color: "var(--chart-1)",
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
                        <div className="grid gap-4 md:grid-cols-3">
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
                                        <TableCell>
                                            <a
                                                href={`tel:${booking.guest_phone}`}
                                                className="text-info hover:underline"
                                            >
                                                {booking.guest_phone || 'Не указан'}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {booking.booking_datetime?.substring(0, 16).replace('T', ' ') || '-'}
                                        </TableCell>
                                        <TableCell>{booking.party_size || 2}</TableCell>
                                        <TableCell>
                                            {Number(booking.discount_applied) > 0 ? (
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
                                                    className="text-error hover:text-error hover:bg-error-light"
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

                {/* Modal для деталей брони */}
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
                                        <Label>Дата/Время</Label>
                                        <p className="text-sm">{selectedBooking.booking_datetime?.substring(0, 16).replace('T', ' ')}</p>
                                    </div>
                                    <div>
                                        <Label>Количество гостей</Label>
                                        <p className="text-sm">{selectedBooking.party_size}</p>
                                    </div>
                                    <div>
                                        <Label>Скидка</Label>
                                        <p className="text-sm">{selectedBooking.discount_applied ? `-${selectedBooking.discount_applied}%` : '—'}</p>
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
            </main>
        </PageHeader>
    );
}
