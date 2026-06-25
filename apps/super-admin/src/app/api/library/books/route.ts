import { NextResponse } from 'next/server';
import { readStore, writeStore, nextId } from '@/lib/library-store';

export async function GET() {
  const store = await readStore();
  const books = (store.books || []).map((b: any) => ({
    ...b,
    copies: (store.copies || []).filter((c: any) => c.book_id === b.id),
  }));
  return NextResponse.json({ success: true, data: books });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title) return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 });
    const store = await readStore();
    const id = nextId(store.books || []);
    const book = { id, title: body.title, category_id: body.category_id || null, author: body.author || null, publisher: body.publisher || null, isbn: body.isbn || null, total_copies: body.total_copies || 0 };
    store.books = [...(store.books || []), book];
    // add copies if provided
    if (body.total_copies && body.total_copies > 0) {
      const start = nextId(store.copies || []);
      for (let i = 0; i < body.total_copies; i++) {
        const copy = { id: start + i, book_id: id, barcode: `B${id}-C${i + 1}`, status: 'available' };
        store.copies = [...(store.copies || []), copy];
      }
    }
    await writeStore(store);
    return NextResponse.json({ success: true, data: book });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
