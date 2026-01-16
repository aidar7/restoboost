import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.restaurant_id || !body?.date || !body?.time || !body?.party_size || !body?.guest_name || !body?.phone) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  // Мок booking_id
  const booking_id = `B-${Date.now()}`;

  return NextResponse.json({ booking_id });
}
