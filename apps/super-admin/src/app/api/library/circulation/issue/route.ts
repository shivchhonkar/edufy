import { NextResponse } from 'next/server';
import { readStore, writeStore, nextId } from '@/lib/library-store';

export async function POST(request: Request) {
  const body = await request.json();
  const { copy_id, member_id, due_days } = body;
  if (!copy_id || !member_id) return NextResponse.json({ success: false, error: 'copy_id and member_id required' }, { status: 400 });
  const store = await readStore();
  const copy = (store.copies || []).find((c: any) => c.id === copy_id);
  if (!copy) return NextResponse.json({ success: false, error: 'Copy not found' }, { status: 404 });
  if (copy.status !== 'available') return NextResponse.json({ success: false, error: 'Copy not available' }, { status: 400 });
  const issueId = nextId(store.issues || []);
  const issued_at = new Date().toISOString().split('T')[0];
  const due_at = new Date(Date.now() + ((due_days || 14) * 24 * 3600 * 1000)).toISOString().split('T')[0];
  const issue = { id: issueId, copy_id, book_id: copy.book_id, member_id, issued_at, due_at, returned_at: null, status: 'issued' };
  store.issues = [...(store.issues || []), issue];
  copy.status = 'issued';
  await writeStore(store);
  return NextResponse.json({ success: true, data: issue });
}
