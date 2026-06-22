/** Split a comma-separated address into two balanced lines for document headers. */
export function splitAddressIntoTwoLines(text?: string | null): [string, string] {
  const trimmed = text?.trim();
  if (!trimmed) return ['', ''];

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(', '), parts.slice(mid).join(', ')];
  }

  const mid = Math.ceil(trimmed.length / 2);
  const splitAt = trimmed.lastIndexOf(' ', mid);
  if (splitAt > 8) {
    return [trimmed.slice(0, splitAt).trim(), trimmed.slice(splitAt).trim()];
  }

  return [trimmed, ''];
}

export function formatAcademicYearLabel(academicYear?: string | null): string | undefined {
  const trimmed = academicYear?.trim();
  if (!trimmed) return undefined;
  if (/^academic year/i.test(trimmed)) return trimmed;
  return `Academic Year ${trimmed}`;
}
