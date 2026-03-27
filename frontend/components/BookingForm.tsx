// components/BookingForm.tsx
'use client';

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/config';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Users, Calendar, Phone, Gift } from 'lucide-react';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────
interface Timeslot {
    time: string;
    available: boolean;
    discount: number;
    booked_guests: number;
    capacity: number;
}

interface BookingFormProps {
    restaurantId: string;
    restaurantName: string;
}

// ─────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────
function getTodayStr() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

function applyPhoneMask(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const local = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
    const d = local.slice(0, 10);
    let result = '+7';
    if (d.length > 0) result += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) result += `) ${d.slice(3, 6)}`;
    if (d.length >= 6) result += `-${d.slice(6, 8)}`;
    if (d.length >= 8) result += `-${d.slice(8, 10)}`;
    return result;
}

function getRawPhone(masked: string): string {
    return masked.replace(/\D/g, '');
}

function isPhoneValid(masked: string): boolean {
    return getRawPhone(masked).length === 11;
}

function isEmailValid(email: string): boolean {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getOccupancyLabel(booked: number, capacity: number): string {
    const left = capacity - booked;
    if (left <= 0) return 'Мест нет';
    if (left <= 3) return `${left} м.`;
    return '';
}

function generateDays(fromStr: string, count = 14): string[] {
    const result: string[] = [];
    const base = new Date(fromStr + 'T00:00:00');
    for (let i = 0; i < count; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        result.push(d.toISOString().slice(0, 10));
    }
    return result;
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const STORAGE_KEY = 'booking_contact_info';

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function SlotsSkeleton() {
    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex-shrink-0 w-[84px] h-[80px] rounded-xl bg-muted animate-pulse"
                    style={{ animationDelay: `${i * 60}ms` }}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// TimeslotButton — без иконки Clock
// ─────────────────────────────────────────────
const TimeslotButton = React.memo(({
    slot, selected, onSelect,
}: {
    slot: Timeslot;
    selected: boolean;
    onSelect: () => void;
}) => {
    const occupancyLabel = getOccupancyLabel(slot.booked_guests, slot.capacity);

    return (
        <div className="relative pt-3 h-[80px]">
            {/* Бэдж скидки — по центру сверху */}
            {slot.discount > 0 && (
                <span className="absolute top-0 right-0 z-10 text-[10px] font-bold px-2 py-0.5 bg-green-600 text-white leading-[1.4] rounded-tr-[10px] rounded-bl-[6px]">
                    -{slot.discount}%
                </span>
            )}

            <button
                type="button"
                disabled={!slot.available}
                onClick={onSelect}
                aria-pressed={selected}
                aria-label={`Время ${slot.time}${slot.discount > 0 ? `, скидка ${slot.discount}%` : ''}`}
                className={`
                    flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200
    px-3 w-full min-w-[76px] h-[64px]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                    ${!slot.available
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-40 border-border'
                        : selected
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'border-border hover:border-primary hover:bg-primary/5 bg-background'
                    }
                `}
            >
                {/* Время — крупно, без иконки */}
                <div className="text-base font-bold leading-none tabular-nums">
                    {slot.time}
                </div>
            </button>
        </div>
    );
});
TimeslotButton.displayName = 'TimeslotButton';

// ─────────────────────────────────────────────
// DateStrip
// ─────────────────────────────────────────────
const DateStrip = React.memo(({
    selectedDate, onSelect, minDate,
}: {
    selectedDate: string;
    onSelect: (d: string) => void;
    minDate: string;
}) => {
    const days = useMemo(() => generateDays(minDate, 14), [minDate]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const idx = days.indexOf(selectedDate);
        if (idx >= 0 && scrollRef.current) {
            const child = scrollRef.current.children[idx] as HTMLElement;
            child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [selectedDate, days]);

    return (
        <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {days.map((dateStr) => {
                const d = new Date(dateStr + 'T00:00:00');
                const weekday = WEEKDAYS[d.getDay()];
                const dayNum = d.getDate();
                const month = MONTHS_SHORT[d.getMonth()];
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === minDate;

                return (
                    <button
                        key={dateStr}
                        type="button"
                        onClick={() => onSelect(dateStr)}
                        aria-pressed={isSelected}
                        aria-label={`${isToday ? 'Сегодня' : weekday}, ${dayNum} ${month}`}
                        className={`
                            flex-shrink-0 flex flex-col items-center rounded-xl border-2 px-2.5 py-2 transition-all duration-200 min-w-[52px]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                            ${isSelected
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'border-border hover:border-primary/60 bg-background'
                            }
                        `}
                    >
                        <span className={`text-[10px] font-medium leading-none mb-1 ${isSelected ? 'text-blue-100' : 'text-muted-foreground'}`}>
                            {isToday ? 'Сег' : weekday}
                        </span>
                        <span className="text-sm font-bold leading-none">{dayNum}</span>
                        <span className={`text-[10px] leading-none mt-0.5 ${isSelected ? 'text-blue-100' : 'text-muted-foreground'}`}>
                            {month}
                        </span>
                    </button>
                );
            })}
        </div>
    );
});
DateStrip.displayName = 'DateStrip';

// ─────────────────────────────────────────────
// Основной компонент
// ─────────────────────────────────────────────
export function BookingForm({ restaurantId, restaurantName }: BookingFormProps) {
    const router = useRouter();
    const today = getTodayStr();

    const [selectedDate, setSelectedDate] = useState(today);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedDiscount, setSelectedDiscount] = useState(0);

    const [formData, setFormData] = useState({
        guest_name: '',
        phone: '',
        guest_email: '',
        party_size: '2',
        special_requests: '',
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    // Загрузка сохранённых контактов
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
        } catch { }
    }, []);

    // Загрузка слотов с авто-выбором первого
    useEffect(() => {
        if (!restaurantId || !selectedDate) { setTimeslots([]); return; }
        const controller = new AbortController();
        const load = async () => {
            setSlotsLoading(true);
            setSelectedTime('');
            setSelectedDiscount(0);
            try {
                const res = await fetch(
                    `${API_BASE}/api/bookings/available-slots?restaurant_id=${restaurantId}&date=${selectedDate}`,
                    { signal: controller.signal }
                );
                if (!res.ok) throw new Error('Failed');
                const slots = await res.json();
                setTimeslots(slots);

                // Автовыбор первого доступного слота
                const firstAvailable = slots.find((s: Timeslot) => s.available);
                if (firstAvailable) {
                    setSelectedTime(firstAvailable.time);
                    setSelectedDiscount(firstAvailable.discount);
                }
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setTimeslots([]);
            } finally {
                setSlotsLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [restaurantId, selectedDate]);

    const handleSelectTimeslot = useCallback((time: string) => {
        const slot = timeslots.find((s) => s.time === time);
        if (!slot?.available) return;
        setSelectedTime(time);
        setSelectedDiscount(slot.discount);
    }, [timeslots]);

    const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, phone: applyPhoneMask(e.target.value) }));
    }, []);

    const handlePhoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === 'Tab') && isPhoneValid(formData.phone)) {
            nameRef.current?.focus();
        }
    }, [formData.phone]);

    const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            emailRef.current?.focus();
        }
    }, []);

    const handleFieldBlur = useCallback((field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setFormData((prev) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    guest_name: prev.guest_name,
                    phone: prev.phone,
                    guest_email: prev.guest_email,
                }));
            } catch { }
            return prev;
        });
    }, []);

    const handleSubmitBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ phone: true, guest_name: true, guest_email: true });

        if (!selectedDate || !selectedTime || !formData.guest_name.trim() || !isPhoneValid(formData.phone)) {
            setBookingError('Пожалуйста, заполните все обязательные поля');
            return;
        }

        setBookingError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    restaurant_id: String(restaurantId),
                    restaurant_name: restaurantName,
                    booking_datetime: `${selectedDate}T${selectedTime}:00`,
                    party_size: formData.party_size,
                    guest_name: formData.guest_name,
                    phone: getRawPhone(formData.phone),
                    guest_email: formData.guest_email || '',
                    special_requests: formData.special_requests,
                    discount_applied: String(selectedDiscount),
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const result = await res.json();

            if (result.success && result.data?.id && result.data?.confirmation_code) {
                router.push(`/customer/booking-confirmation?booking_id=${result.data.id}&code=${result.data.confirmation_code}`);
            } else {
                throw new Error(result.message || 'Ошибка бронирования');
            }
        } catch (e) {
            setBookingError(e instanceof Error ? e.message : 'Ошибка');
        } finally {
            setIsSubmitting(false);
        }
    };

    const phoneError = touched.phone && !isPhoneValid(formData.phone);
    const nameError = touched.guest_name && !formData.guest_name.trim();
    const emailError = touched.guest_email && !isEmailValid(formData.guest_email);
    const canSubmit = !!(selectedDate && selectedTime && formData.guest_name.trim() && isPhoneValid(formData.phone) && !isSubmitting);

    return (
        <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar bg-card border border-border rounded-xl p-6 shadow-lg">

            {/* Заголовок */}
            <div className="mb-5">
                <h3 className="text-2xl font-bold">Забронировать столик</h3>
                {selectedDiscount > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-orange-500 font-semibold">
                        <Gift className="w-4 h-4" />
                        <span>Скидка {selectedDiscount}% на всё меню!</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-5" noValidate>

                {/* Дата */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Дата
                        </label>
                        {selectedDate && (
                            <span className="text-xs text-muted-foreground">{formatDisplayDate(selectedDate)}</span>
                        )}
                    </div>
                    <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} minDate={today} />
                </div>

                {/* Кол-во гостей */}
                <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Кол-во гостей
                    </label>
                    <Select
                        value={formData.party_size}
                        onValueChange={(v) => setFormData({ ...formData, party_size: v })}
                    >
                        <SelectTrigger className="text-sm font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                    {n} {n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Время */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium">Время</label>
                        {!slotsLoading && timeslots.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {timeslots.filter(s => s.available).length} из {timeslots.length} доступно
                            </span>
                        )}
                    </div>

                    <div className="min-h-[96px]">
                        {slotsLoading ? (
                            <SlotsSkeleton />
                        ) : timeslots.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
                                {timeslots.map((slot) => (
                                    <div key={slot.time} className="flex-shrink-0 w-[84px]">
                                        <TimeslotButton
                                            slot={slot}
                                            selected={selectedTime === slot.time}
                                            onSelect={() => handleSelectTimeslot(slot.time)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl flex items-center justify-center min-h-[96px]">
                                Нет доступных слотов на этот день
                            </div>
                        )}
                    </div>

                    {!slotsLoading && !selectedTime && timeslots.some(s => s.available) && (
                        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Выберите время для бронирования
                        </p>
                    )}
                </div>

                {/* Контакты */}
                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Контакты
                    </label>

                    {/* Телефон */}
                    <div className="space-y-1">
                        <Input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            onBlur={() => handleFieldBlur('phone')}
                            onKeyDown={handlePhoneKeyDown}
                            placeholder="+7 (___) ___-__-__"
                            inputMode="tel"
                            autoComplete="tel"
                            aria-invalid={!!phoneError}
                            aria-describedby={phoneError ? 'phone-error' : undefined}
                            className={phoneError ? 'border-red-400 focus-visible:ring-red-300' : ''}
                        />
                        {phoneError && (
                            <p id="phone-error" className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />Введите корректный номер
                            </p>
                        )}
                    </div>

                    {/* Имя */}
                    <div className="space-y-1">
                        <Input
                            ref={nameRef}
                            type="text"
                            name="guest_name"
                            value={formData.guest_name}
                            onChange={(e) => setFormData((p) => ({ ...p, guest_name: e.target.value }))}
                            onBlur={() => handleFieldBlur('guest_name')}
                            onKeyDown={handleNameKeyDown}
                            placeholder="Ваше имя *"
                            autoComplete="name"
                            aria-invalid={!!nameError}
                            aria-describedby={nameError ? 'name-error' : undefined}
                            className={nameError ? 'border-red-400 focus-visible:ring-red-300' : ''}
                        />
                        {nameError && (
                            <p id="name-error" className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />Укажите ваше имя
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <Input
                            ref={emailRef}
                            type="email"
                            name="guest_email"
                            value={formData.guest_email}
                            onChange={(e) => setFormData((p) => ({ ...p, guest_email: e.target.value }))}
                            onBlur={() => handleFieldBlur('guest_email')}
                            placeholder="Email (необязательно)"
                            autoComplete="email"
                            aria-invalid={!!emailError}
                            aria-describedby={emailError ? 'email-error' : undefined}
                            className={emailError ? 'border-red-400 focus-visible:ring-red-300' : ''}
                        />
                        {emailError && (
                            <p id="email-error" className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />Некорректный email
                            </p>
                        )}
                    </div>
                </div>

                {/* Комментарий */}
                <Textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={(e) => setFormData((p) => ({ ...p, special_requests: e.target.value }))}
                    placeholder="Комментарий к брони (например: столик у окна)"
                    rows={2}
                />

                {/* Ошибка сабмита */}
                {bookingError && (
                    <div role="alert" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {bookingError}
                    </div>
                )}

                {/* Кнопка */}
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full font-semibold py-6 text-base rounded-lg bg-primary hover:bg-primary/90 text-white transition-all duration-200"
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Оформляем бронь...</>
                    ) : (
                        'Забронировать столик'
                    )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                    * — поля обязательные для заполнения
                </p>

            </form>
        </div>
    );
}
