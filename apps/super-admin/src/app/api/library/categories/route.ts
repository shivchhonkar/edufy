import { NextResponse } from 'next/server';
import { readStore, writeStore, nextId } from '@/lib/library-store';

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ success: true, data: store.categories || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
  const store = await readStore();
  const id = nextId(store.categories || []);
  const category = { id, name: body.name };
  store.categories = [...(store.categories || []), category];
  await writeStore(store);
  return NextResponse.json({ success: true, data: category });
}
