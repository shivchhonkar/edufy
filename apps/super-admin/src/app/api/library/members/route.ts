import { NextResponse } from 'next/server';
import { readStore, writeStore, nextId } from '@/lib/library-store';

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ success: true, data: store.members || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
  const store = await readStore();
  const id = nextId(store.members || []);
  const member = { id, name: body.name, card_number: body.card_number || `M-${String(id).padStart(3, '0')}`, active: true };
  store.members = [...(store.members || []), member];
  await writeStore(store);
  return NextResponse.json({ success: true, data: member });
}
