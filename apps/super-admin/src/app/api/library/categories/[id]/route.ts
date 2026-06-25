import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/library-store';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const body = await request.json();
  const store = await readStore();
  const idx = (store.categories || []).findIndex((c: any) => c.id === id);
  if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  store.categories[idx] = { ...store.categories[idx], ...body };
  await writeStore(store);
  return NextResponse.json({ success: true, data: store.categories[idx] });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const store = await readStore();
  store.categories = (store.categories || []).filter((c: any) => c.id !== id);
  await writeStore(store);
  return NextResponse.json({ success: true });
}
