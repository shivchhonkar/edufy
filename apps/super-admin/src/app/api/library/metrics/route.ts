import { NextResponse } from 'next/server';
import { readStore } from '@/lib/library-store';

export async function GET() {
  try {
    const store = await readStore();
    const metrics = {
      totalBooks: store.books.reduce((s: number, b: any) => s + (b.total_copies || 0), 0),
      totalTitles: store.books.length,
      availableBooks: store.copies.filter((c: any) => c.status === 'available').length,
      issuedBooks: store.copies.filter((c: any) => c.status === 'issued').length,
      overdueBooks: store.issues.filter((i: any) => i.status === 'issued' && new Date(i.due_at) < new Date()).length,
      lostBooks: store.copies.filter((c: any) => c.status === 'lost').length,
      reservedBooks: store.copies.filter((c: any) => c.status === 'reserved').length,
      activeMembers: store.members.filter((m: any) => m.active).length,
      newArrivals: 0,
      fineCollectionToday: 0,
    };
    return NextResponse.json({ success: true, data: metrics });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
