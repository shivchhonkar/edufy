export function studentSearchSql(paramIndex: number, alias = 's'): string {
  const p = `${alias}.`
  const ph = `$${paramIndex}`
  return `(
    ${p}first_name ILIKE ${ph}
    OR ${p}middle_name ILIKE ${ph}
    OR ${p}last_name ILIKE ${ph}
    OR ${p}admission_number ILIKE ${ph}
    OR ${p}student_code ILIKE ${ph}
    OR ${p}roll_number ILIKE ${ph}
    OR ${p}parent_phone ILIKE ${ph}
    OR ${p}mother_phone ILIKE ${ph}
    OR ${p}emergency_contact ILIKE ${ph}
    OR ${p}parent_name ILIKE ${ph}
    OR ${p}mother_name ILIKE ${ph}
    OR EXISTS (
      SELECT 1 FROM student_guardians sg
      WHERE sg.student_id = ${p}id AND sg.name ILIKE ${ph}
    )
    OR (${p}first_name || ' ' || COALESCE(${p}middle_name || ' ', '') || ${p}last_name) ILIKE ${ph}
  )`
}

export function studentCountSearchSql(paramIndex: number): string {
  return `(
    first_name ILIKE $${paramIndex}
    OR middle_name ILIKE $${paramIndex}
    OR last_name ILIKE $${paramIndex}
    OR admission_number ILIKE $${paramIndex}
    OR student_code ILIKE $${paramIndex}
    OR roll_number ILIKE $${paramIndex}
    OR parent_phone ILIKE $${paramIndex}
    OR mother_phone ILIKE $${paramIndex}
    OR emergency_contact ILIKE $${paramIndex}
    OR parent_name ILIKE $${paramIndex}
    OR mother_name ILIKE $${paramIndex}
    OR EXISTS (
      SELECT 1 FROM student_guardians sg
      WHERE sg.student_id = students.id AND sg.name ILIKE $${paramIndex}
    )
    OR (first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name) ILIKE $${paramIndex}
  )`
}
