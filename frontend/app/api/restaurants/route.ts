import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // TODO: сюда потом добавим реальный запрос к БД
  return NextResponse.json([]);
}
