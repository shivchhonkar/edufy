export const DEFAULT_BULK_SUBJECTS_PRESET =
  'English\nHindi\nMathematics\nScience\nSocial Studies\nComputer';

/** Same code generation used on the setup wizard subjects step. */
export function subjectCodeFromName(name: string): string {
  return name.toUpperCase().replace(/\s+/g, '').slice(0, 6);
}
