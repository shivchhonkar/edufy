import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/library-store';

export async function POST(request: Request) {
  const body = await request.json();
  const { issue_id } = body;
  if (!issue_id) return NextResponse.json({ success: false, error: 'issue_id required' }, { status: 400 });
  const store = await readStore();
  const issue = (store.issues || []).find((i: any) => i.id === issue_id);
  if (!issue) return NextResponse.json({ success: false, error: 'Issue not found' }, { status: 404 });
  if (issue.status !== 'issued') return NextResponse.json({ success: false, error: 'Issue not active' }, { status: 400 });
  const returned_at = new Date().toISOString().split('T')[0];
  issue.returned_at = returned_at;
  issue.status = 'returned';
  const copy = (store.copies || []).find((c: any) => c.id === issue.copy_id);
  if (copy) copy.status = 'available';
  await writeStore(store);
  return NextResponse.json({ success: true, data: issue });
}
