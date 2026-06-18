import { NextRequest, NextResponse } from 'next/server'
import { fetchSchoolBranding } from '@/lib/school-info'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host')
  const branding = await fetchSchoolBranding(host)
  return NextResponse.json({ success: true, data: branding })
}
