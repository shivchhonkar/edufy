import { NextResponse } from 'next/server';
import { readStore } from '@/lib/library-store';

export async function GET() {
  try {
    const store = await readStore();
    const issues = (store.issues || []).map((i: any) => ({
      ...i,
      book: (store.books || []).find((b: any) => b.id === i.book_id) || null,
      member: (store.members || []).find((m: any) => m.id === i.member_id) || null,
      copy: (store.copies || []).find((c: any) => c.id === i.copy_id) || null,
    }));
    return NextResponse.json({ success: true, data: issues });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
