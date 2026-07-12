const ROMAN_VALUES: ReadonlyArray<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

const ROMAN_PATTERN = /^[IVXLCDM]+$/i;

function numberToRoman(value: number): string {
  if (value <= 0 || value > 3999) return String(value);

  let remaining = value;
  let result = '';

  for (const [amount, numeral] of ROMAN_VALUES) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }

  return result;
}

function parseRomanNumeral(value: string): number | null {
  const upper = value.toUpperCase();
  if (!ROMAN_PATTERN.test(upper)) return null;

  let index = 0;
  let total = 0;

  while (index < upper.length) {
    let matched = false;

    for (const [amount, numeral] of ROMAN_VALUES) {
      if (upper.startsWith(numeral, index)) {
        total += amount;
        index += numeral.length;
        matched = true;
        break;
      }
    }

    if (!matched) return null;
  }

  return total > 0 ? total : null;
}

function extractClassNumber(className: string): number | null {
  const trimmed = className.trim();
  if (!trimmed || trimmed === '—') return null;

  if (ROMAN_PATTERN.test(trimmed)) {
    return parseRomanNumeral(trimmed);
  }

  const withoutPrefix = trimmed.replace(/^class\s*[-:]?\s*/i, '').trim();
  if (!withoutPrefix) return null;

  if (ROMAN_PATTERN.test(withoutPrefix)) {
    return parseRomanNumeral(withoutPrefix);
  }

  const numericMatch = withoutPrefix.match(/^(\d{1,4})\b/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }

  return null;
}

/** Display class names as Roman numerals (e.g. Class 7 → VII). */
export function formatClassNameRoman(className: string | null | undefined): string {
  const trimmed = String(className || '').trim();
  if (!trimmed || trimmed === '—') return '—';

  const classNumber = extractClassNumber(trimmed);
  if (classNumber !== null && classNumber > 0) {
    return numberToRoman(classNumber);
  }

  return trimmed.replace(/^class\s+/i, '').trim() || trimmed;
}
