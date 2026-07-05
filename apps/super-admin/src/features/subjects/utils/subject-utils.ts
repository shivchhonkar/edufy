export const DEFAULT_BULK_SUBJECTS_PRESET =
  'English\nHindi\nMathematics\nScience\nSocial Studies\nComputer';

/** Same code generation used on the setup wizard subjects step. */
export function subjectCodeFromName(name: string): string {
  return name.toUpperCase().replace(/\s+/g, '').slice(0, 6);
}

export function normalizeSubjectCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function buildExistingSubjectNameSet(names: string[]) {
  return new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean));
}

export function buildExistingSubjectCodeSet(codes: string[]) {
  return new Set(codes.map((code) => normalizeSubjectCode(code)).filter(Boolean));
}

export function generateUniqueSubjectCode(name: string, existingCodes: Set<string>): string {
  const base = normalizeSubjectCode(subjectCodeFromName(name)) || 'SUB';
  if (!existingCodes.has(base)) return base;

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const suffixText = String(suffix);
    const candidate = `${base.slice(0, Math.max(1, 6 - suffixText.length))}${suffixText}`;
    if (!existingCodes.has(candidate)) return candidate;
  }

  return `${base.slice(0, 3)}${Date.now().toString().slice(-3)}`.slice(0, 6);
}

export function filterPendingSubjectLines(text: string, existingNames: Set<string>) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !existingNames.has(line.toLowerCase()));
}
