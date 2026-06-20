import type { RequestDb } from '@/lib/request-db'

export interface ParentNotification {
  id: number
  title: string
  message: string
  priority: string
  published_at: string | null
  created_at: string
}

function buildAudienceFilter(classId: number | null, sectionId: number | null) {
  const params: unknown[] = []
  const parts = [`audience_type IN ('all', 'all_parents')`]

  if (classId != null) {
    params.push(classId)
    parts.push(`(audience_type = 'class_parents' AND class_id = $${params.length})`)
  }

  if (classId != null && sectionId != null) {
    params.push(classId, sectionId)
    parts.push(
      `(audience_type = 'section_parents' AND class_id = $${params.length - 1} AND section_id = $${params.length})`,
    )
  }

  return {
    sql: `(${parts.join(' OR ')})`,
    params,
  }
}

const ACTIVE_NOTIFICATION_WHERE = `
  status = 'active'
  AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
`

export async function fetchParentNotifications(
  db: RequestDb,
  classId: number | null,
  sectionId: number | null,
  limit = 10,
): Promise<ParentNotification[]> {
  try {
    const audience = buildAudienceFilter(classId, sectionId)
    const params = [...audience.params, limit]

    const result = await db.query<ParentNotification>(
      `SELECT id, title, message, priority,
              COALESCE(published_at, created_at)::text AS published_at,
              created_at::text AS created_at
       FROM school_notifications
       WHERE ${ACTIVE_NOTIFICATION_WHERE}
         AND ${audience.sql}
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT $${params.length}`,
      params,
    )

    return result.rows
  } catch {
    return []
  }
}

export async function fetchParentNotificationsCount(
  db: RequestDb,
  classId: number | null,
  sectionId: number | null,
): Promise<number> {
  try {
    const audience = buildAudienceFilter(classId, sectionId)

    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM school_notifications
       WHERE ${ACTIVE_NOTIFICATION_WHERE}
         AND ${audience.sql}`,
      audience.params,
    )

    return Number(result.rows[0]?.count) || 0
  } catch {
    return 0
  }
}

export async function fetchLatestParentCircular(
  db: RequestDb,
  classId: number | null,
  sectionId: number | null,
) {
  try {
    const audience = buildAudienceFilter(classId, sectionId)
    const params = [...audience.params]

    const result = await db.query<{ title: string; content: string; published_at: string }>(
      `SELECT title, content, COALESCE(published_at, created_at)::text AS published_at
       FROM school_circulars
       WHERE status = 'published'
         AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
         AND ${audience.sql}
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT 1`,
      params,
    )

    return result.rows[0] || null
  } catch {
    return null
  }
}
