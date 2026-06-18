import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureHrSchema } from '@/lib/ensure-hr-schema'
import { studentSearchSql } from '@/lib/student-search'
import { staffSearchSql } from '@/lib/staff-search'
import {
  buildGuardianLabelFromSources,
  fetchGuardiansForStudents,
} from '@/lib/guardian-display'
import { ensureStudentMotherColumns } from '@/lib/student-profile-api'

export type QuickSearchResultType = 'student' | 'staff'

export interface QuickSearchResult {
  type: QuickSearchResultType
  id: number
  name: string
  subtitle: string
  guardian_label: string
  phone?: string
  href: string
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const query = request.nextUrl.searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '8', 10), 10)

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] as QuickSearchResult[] })
    }

    await ensureHrSchema(db)
    await ensureStudentMotherColumns(db)

    const searchValue = `%${query}%`

    let studentsResult = { rows: [] as Record<string, unknown>[] }
    try {
      studentsResult = await db.query(
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
    } catch (studentError) {
      console.error('Student quick search query failed:', studentError)
    }

    let staffResult = { rows: [] as Record<string, unknown>[] }
    try {
      staffResult = await db.query(
        `SELECT s.id, s.first_name, s.last_name, s.phone, s.employee_id,
                s.designation, d.name AS department_name
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.status = 'active'
         AND ${staffSearchSql(1)}
         ORDER BY s.first_name ASC, s.last_name ASC
         LIMIT $2`,
        [searchValue, limit],
      )
    } catch (staffError) {
      console.error('Staff quick search query failed:', staffError)
    }

    const studentIds = studentsResult.rows.map((row) => Number(row.id)).filter(Boolean)
    const guardiansByStudent = await fetchGuardiansForStudents(db, studentIds)

    const students: QuickSearchResult[] = studentsResult.rows.map((row) => {
      const id = Number(row.id)
      const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ')
      const classLabel = [row.class_name, row.section_name].filter(Boolean).join(' - ')
      const guardianLabel = buildGuardianLabelFromSources(
        row.parent_name as string | null,
        row.mother_name as string | null,
        guardiansByStudent.get(id) || [],
      )

      return {
        type: 'student',
        id,
        name,
        subtitle: [classLabel || 'Unassigned', row.admission_number].filter(Boolean).join(' · '),
        guardian_label: guardianLabel || 'No parent/guardian on file',
        phone: (row.parent_phone as string) || undefined,
        href: `/students/${id}`,
      }
    })

    const staff: QuickSearchResult[] = staffResult.rows.map((row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
      const roleLabel = [row.designation, row.department_name].filter(Boolean).join(' · ')

      return {
        type: 'staff',
        id: Number(row.id),
        name,
        subtitle: [roleLabel || 'Staff', row.employee_id].filter(Boolean).join(' · '),
        guardian_label: '',
        phone: (row.phone as string) || undefined,
        href: `/staff/${row.id}`,
      }
    })

    const data = [...students, ...staff].slice(0, limit * 2)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Quick search error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
