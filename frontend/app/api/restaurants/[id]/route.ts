import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const restaurantId = Number(id);
  if (!Number.isFinite(restaurantId)) {
    return NextResponse.json({ error: 'invalid restaurant id' }, { status: 400 });
  }

  return NextResponse.json({
    id: restaurantId,
    name: `Restaurant #${restaurantId}`,
    address: 'Almaty, Example street 1',
    phone: '+77771234567',
    cuisine: ['Европейская', 'Азиатская'],
    rating: 4.7,
    avg_check: 5000,
    description: 'Описание ресторана (мок).',
    photos: [],
  });
}
