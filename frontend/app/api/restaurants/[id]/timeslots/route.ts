// app/api/restaurants/[id]/timeslots/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Timeslot = {
  time: string;
  discount: number;
  available: boolean;
};

type DaySlots = {
  date: string;
  slots: Timeslot[];
};

function generateSlotsForDay(
  rows: any[],
  dateStr: string
): Timeslot[] {
  const slots: Timeslot[] = [];

  for (const row of rows) {
    const discount = row.discount ?? 0;
    const maxTables = row.max_tables ?? 0;

    const start = row.time_start as string; // '18:00:00'
    const end = row.time_end as string;     // '21:00:00'

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    // шаг 60 минут
    for (let m = startMinutes; m < endMinutes; m += 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      const label = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

      slots.push({
        time: label,
        discount,
        // Пока не считаем занятость по бронированиям — просто есть слоты
        available: maxTables > 0 || maxTables === 0,
      });
    }
  }

  // сортировка по времени
  slots.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return slots;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurantId = Number(id);

  if (!Number.isFinite(restaurantId)) {
    return NextResponse.json({ error: 'invalid restaurant id' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);

  const singleDate = searchParams.get('date'); // старый режим
  const fromParam = searchParams.get('from');  // новый режим
  const daysParam = searchParams.get('days');

  // ===== 1) Старый режим: ?date=YYYY-MM-DD → массив слотов на один день =====
  if (singleDate) {
    const date = new Date(singleDate + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('restaurant_timeslots')
      .select('time_start, time_end, discount, is_active, max_tables, valid_from, valid_to')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('valid_from', singleDate)
      .gte('valid_to', singleDate);

    if (error) {
      console.error('supabase timeslots error', error);
      return NextResponse.json({ error: 'failed to load timeslots' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json<Timeslot[]>([]);
    }

    const slots = generateSlotsForDay(data as any[], singleDate);
    return NextResponse.json<Timeslot[]>(slots);
  }

  // ===== 2) Новый режим: неделя без обязательной даты =====
  const today = new Date();
  const defaultFrom = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const fromDateStr = fromParam || defaultFrom;
  const days = daysParam ? Number(daysParam) : 7;

  if (!Number.isFinite(days) || days <= 0 || days > 31) {
    return NextResponse.json({ error: 'invalid days param' }, { status: 400 });
  }

  const results: DaySlots[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(fromDateStr);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid from date format' }, { status: 400 });
    }
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('restaurant_timeslots')
      .select('time_start, time_end, discount, is_active, max_tables, valid_from, valid_to')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('valid_from', dateStr)
      .gte('valid_to', dateStr);

    if (error) {
      console.error('supabase timeslots error', error);
      return NextResponse.json({ error: 'failed to load timeslots' }, { status: 500 });
    }

    const slots = data && data.length > 0
      ? generateSlotsForDay(data as any[], dateStr)
      : [];

    results.push({
      date: dateStr,
      slots,
    });
  }

  return NextResponse.json<DaySlots[]>(results);
}
