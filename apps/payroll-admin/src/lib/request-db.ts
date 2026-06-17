import { NextRequest, NextResponse } from 'next/server'
import { getTenantFromRequest } from '@edulakhya/tenant'
import { queryForTenant, query } from '@edulakhya/database'
import type { TenantContext } from '@edulakhya/types'
import type { QueryResult, QueryResultRow } from 'pg'

export interface RequestDb {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<QueryResult<T>>
}

export async function getRequestDbOrError(
  request: NextRequest,
): Promise<{ db: RequestDb; context: TenantContext | null } | NextResponse> {
  const host = request.headers.get('host') ?? null
  const isSubdomain = host?.includes('.localhost')

  try {
    const resolved = await getTenantFromRequest(host)
    if (resolved) {
      const { dbConfig } = resolved
      return {
        context: resolved.context,
        db: {
          query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
            queryForTenant<T>(dbConfig, text, params),
        },
      }
    }
    if (isSubdomain) {
      return NextResponse.json({ success: false, error: 'School not found.' }, { status: 404 })
    }
  } catch (error) {
    console.error('Tenant resolution failed:', error)
    if (isSubdomain) {
      return NextResponse.json({ success: false, error: 'School not found.' }, { status: 404 })
    }
  }

  return { context: null, db: { query: query as RequestDb['query'] } }
}
