import { NextRequest, NextResponse } from 'next/server'
import { fetchSchoolBranding } from '@/lib/school-info'

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host')
    const branding = await fetchSchoolBranding(host)
    return NextResponse.json({ success: true, data: branding })
  } catch (error) {
    console.error('School info API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load school info' }, { status: 500 })
  }
}
