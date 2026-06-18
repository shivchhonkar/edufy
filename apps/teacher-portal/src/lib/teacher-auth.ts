import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@edulakhya/auth'
import type { RequestDb } from '@/lib/request-db'

export interface TeacherAuthUser {
  id: number
  email: string
  role: string
  full_name: string
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieToken = request.cookies.get('token')?.value
  return cookieToken || null
}

export function requireTeacherAuth(
  request: NextRequest,
): { user: TeacherAuthUser } | NextResponse {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const decoded = verifyToken(token) as TeacherAuthUser | null
  if (!decoded?.id) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
  }

  return { user: decoded }
}

export async function resolveStaffId(db: RequestDb, userId: number): Promise<number | null> {
  const byUserId = await db.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [userId])
  if (byUserId.rows[0]?.id) return Number(byUserId.rows[0].id)

  const byEmail = await db.query(
    `SELECT s.id FROM staff s
     JOIN users u ON LOWER(COALESCE(s.email, '')) = LOWER(u.email)
     WHERE u.id = $1 LIMIT 1`,
    [userId],
  )
  if (byEmail.rows[0]?.id) return Number(byEmail.rows[0].id)
  return null
}

export async function teacherHasClassAccess(
  db: RequestDb,
  staffId: number,
  classId: number,
  sectionId?: number | null,
): Promise<boolean> {
  const params: number[] = [staffId, classId]
  let sectionClause = ''
  if (sectionId) {
    params.push(sectionId)
    sectionClause = ` AND (ta.section_id IS NULL OR ta.section_id = $${params.length})`
  }

  const result = await db.query(
    `SELECT id FROM teacher_assignments ta
     WHERE ta.staff_id = $1 AND ta.class_id = $2${sectionClause}
     LIMIT 1`,
    params,
  )
  return result.rows.length > 0
}

export async function ensureTeacherSchema(db: RequestDb) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      academic_year VARCHAR(50) NOT NULL,
      is_class_teacher BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, class_id, section_id, subject_id, academic_year)
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_assignments_staff ON teacher_assignments(staff_id);
  `)
}
