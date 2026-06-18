export function staffSearchSql(paramIndex: number, alias = 's'): string {
  const p = `${alias}.`
  const ph = `$${paramIndex}`
  return `(
    ${p}first_name ILIKE ${ph}
    OR ${p}last_name ILIKE ${ph}
    OR ${p}phone ILIKE ${ph}
    OR ${p}employee_id ILIKE ${ph}
    OR ${p}email ILIKE ${ph}
    OR ${p}emergency_contact ILIKE ${ph}
    OR (${p}first_name || ' ' || ${p}last_name) ILIKE ${ph}
  )`
}

export function staffCountSearchSql(paramIndex: number): string {
  const ph = `$${paramIndex}`
  return `(
    first_name ILIKE ${ph}
    OR last_name ILIKE ${ph}
    OR phone ILIKE ${ph}
    OR employee_id ILIKE ${ph}
    OR email ILIKE ${ph}
    OR emergency_contact ILIKE ${ph}
    OR (first_name || ' ' || last_name) ILIKE ${ph}
  )`
}
