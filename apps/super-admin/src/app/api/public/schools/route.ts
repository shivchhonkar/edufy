import { NextRequest } from 'next/server';
import { corsJsonResponse } from '@edulakhya/utils/cors';
import { searchPublicSchools } from '@edulakhya/tenant';

/** Public school directory search for the parent app. */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')?.trim() ?? '';
  const name = request.nextUrl.searchParams.get('name')?.trim() ?? '';

  if (city.length < 2 && name.length < 2) {
    return corsJsonResponse(
      request,
      { success: false, error: 'Enter a city or school name (at least 2 characters).' },
      { status: 400 },
    );
  }

  const schools = await searchPublicSchools(city, name);
  return corsJsonResponse(request, {
    success: true,
    data: schools.map((school) => ({
      id: school.id,
      name: school.name,
      slug: school.slug,
      city: school.city,
      school_code: school.school_code,
    })),
  });
}
