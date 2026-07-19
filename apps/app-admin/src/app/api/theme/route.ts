import { NextResponse } from 'next/server';
import { DEFAULT_THEME_SETTINGS } from '@edulakhya/utils';

/** Platform admin uses default portal theme (no school DB). */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: DEFAULT_THEME_SETTINGS,
  });
}
