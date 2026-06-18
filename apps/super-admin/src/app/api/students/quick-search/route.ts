import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { studentSearchSql } from '@/lib/student-search'
import {
  buildGuardianLabelFromSources,
  fetchGuardiansForStudents,
} from '@/lib/guardian-display'
import { ensureStudentMotherColumns } from '@/lib/student-profile-api'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const query = request.nextUrl.searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '8', 10), 20)

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    await ensureStudentMotherColumns(db)

    const searchValue = `%${query}%`
    const result = await db.query(
      `SELECT s.id, s.first_name, s.middle_name, s.last_name, s.admission_number,
              s.roll_number, s.parent_phone, s.parent_name, s.mother_name,
              c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.status = 'active'
       AND ${studentSearchSql(1)}
       ORDER BY s.first_name ASC, s.last_name ASC
       LIMIT $2`,
      [searchValue, limit],
    )

    const studentIds = result.rows.map((row) => Number(row.id)).filter(Boolean)
    const guardiansByStudent = await fetchGuardiansForStudents(db, studentIds)

    const data = result.rows.map((row) => {
      const id = Number(row.id)
      const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ')
      const classLabel = [row.class_name, row.section_name].filter(Boolean).join(' - ')
      const guardianLabel = buildGuardianLabelFromSources(
        row.parent_name,
        row.mother_name,
        guardiansByStudent.get(id) || [],
      )

      return {
        type: 'student' as const,
        id,
        name,
        admission_number: row.admission_number,
        roll_number: row.roll_number,
        phone: row.parent_phone,
        class_label: classLabel || 'Unassigned',
        subtitle: [classLabel || 'Unassigned', row.admission_number].filter(Boolean).join(' · '),
        guardian_label: guardianLabel || 'No parent/guardian on file',
        href: `/students/${id}`,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Student quick search error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
