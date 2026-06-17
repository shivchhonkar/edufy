/** Natural numeric order for class names (Class 1, Class 2, … Class 10). */
export function compareClassNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortClassesByName<T extends { name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => compareClassNames(a.name, b.name));
}

export function classNameOrderSql(
  column: string,
  options?: { nullsFirst?: boolean; prioritizeNull?: boolean }
): string {
  const digits = `NULLIF(regexp_replace(${column}, '[^0-9]', '', 'g'), '')`;
  const nullsClause = options?.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
  const parts: string[] = [];

  if (options?.prioritizeNull) {
    parts.push(`CASE WHEN ${column} IS NULL THEN 0 ELSE 1 END`);
  }

  parts.push(`CASE WHEN ${digits} IS NOT NULL THEN ${digits}::int END ${nullsClause}`);
  parts.push(`${column} ASC ${nullsClause}`);

  return parts.join(', ');
}
