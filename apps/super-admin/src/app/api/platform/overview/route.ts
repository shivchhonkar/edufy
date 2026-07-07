import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-auth';
import { listOrganizations, listTenants } from '@edulakhya/tenant';

export async function GET(request: NextRequest) {
  const auth = requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const [organizations, schools] = await Promise.all([listOrganizations(), listTenants()]);

  return NextResponse.json({
    success: true,
    data: {
      organizations,
      schools,
      totals: {
        organizations: organizations.length,
        schools: schools.length,
      },
    },
  });
}
