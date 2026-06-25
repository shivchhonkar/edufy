import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/library-store';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const body = await request.json();
  const store = await readStore();
  const idx = (store.books || []).findIndex((b: any) => b.id === id);
  if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  store.books[idx] = { ...store.books[idx], ...body };
  await writeStore(store);
  return NextResponse.json({ success: true, data: store.books[idx] });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const store = await readStore();
  store.books = (store.books || []).filter((b: any) => b.id !== id);
  store.copies = (store.copies || []).filter((c: any) => c.book_id !== id);
  await writeStore(store);
  return NextResponse.json({ success: true });
}
