export type GuardianRow = {
  relation_type: string
  name: string
}

export function buildGuardianLabelFromSources(
  parentName?: string | null,
  motherName?: string | null,
  guardians: GuardianRow[] = [],
): string {
  const parts: string[] = []

  const fatherFromGuardian = guardians.find((g) => g.relation_type === 'father')?.name
  const motherFromGuardian = guardians.find((g) => g.relation_type === 'mother')?.name
  const father = (fatherFromGuardian || parentName || '').trim()
  const mother = (motherFromGuardian || motherName || '').trim()

  if (father) parts.push(`Father: ${father}`)
  if (mother) parts.push(`Mother: ${mother}`)

  for (const guardian of guardians) {
    if (guardian.relation_type !== 'guardian') continue
    const name = guardian.name?.trim()
    if (name) parts.push(`Guardian: ${name}`)
  }

  if (!parts.length) {
    for (const guardian of guardians) {
      const name = guardian.name?.trim()
      if (!name) continue
      if (guardian.relation_type === 'father' || guardian.relation_type === 'mother') continue
      parts.push(`${capitalizeRelation(guardian.relation_type)}: ${name}`)
    }
  }

  if (!parts.length && guardians.length) {
    const first = guardians.find((g) => g.name?.trim())
    if (first?.name?.trim()) {
      parts.push(`${capitalizeRelation(first.relation_type)}: ${first.name.trim()}`)
    }
  }

  return parts.join(' · ')
}

function capitalizeRelation(value: string): string {
  if (!value) return 'Guardian'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function groupGuardiansByStudentId(
  rows: { student_id: number; relation_type: string; name: string }[],
): Map<number, GuardianRow[]> {
  const map = new Map<number, GuardianRow[]>()
  for (const row of rows) {
    const list = map.get(row.student_id) || []
    list.push({ relation_type: row.relation_type, name: row.name })
    map.set(row.student_id, list)
  }
  return map
}

export async function fetchGuardiansForStudents(
  db: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  studentIds: number[],
): Promise<Map<number, GuardianRow[]>> {
  if (!studentIds.length) return new Map()

  try {
    const result = await db.query(
      `SELECT student_id, relation_type, name
       FROM student_guardians
       WHERE student_id = ANY($1::int[])
       ORDER BY student_id,
         CASE relation_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 ELSE 3 END,
         id ASC`,
      [studentIds],
    )
    return groupGuardiansByStudentId(
      result.rows as { student_id: number; relation_type: string; name: string }[],
    )
  } catch {
    return new Map()
  }
}
