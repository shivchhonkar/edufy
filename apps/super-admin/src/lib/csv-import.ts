export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

export function csvToObjects<T extends Record<string, string>>(
  text: string,
  requiredHeaders: string[]
): { headers: string[]; rows: T[]; errors: string[] } {
  const parsed = parseCsv(text);
  const errors: string[] = [];

  if (parsed.length < 2) {
    return { headers: [], rows: [], errors: ['CSV must include a header row and at least one data row'] };
  }

  const headers = parsed[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      errors.push(`Missing required column: ${req}`);
    }
  }
  if (errors.length > 0) {
    return { headers, rows: [], errors };
  }

  const rows = parsed.slice(1).map((cells, index) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      obj[header] = cells[colIndex] ?? '';
    });
    if (!Object.values(obj).some(Boolean)) return null;
    return obj as T;
  }).filter((row): row is T => row !== null);

  if (rows.length === 0) {
    errors.push('No data rows found');
  }

  return { headers, rows, errors };
}
