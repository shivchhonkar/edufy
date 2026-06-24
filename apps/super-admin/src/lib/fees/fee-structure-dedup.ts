export type DedupFeeStructure = {
  id: number;
  class_id: number | null;
  fee_type: string;
  frequency: string;
};

const FREQUENCY_PRIORITY: Record<string, number> = {
  one_time: 5,
  yearly: 4,
  half_yearly: 3,
  quarterly: 2,
  monthly: 1,
};

function feeTypeKey(feeType: string): string {
  return feeType.toLowerCase().trim();
}

function structureScore(structure: DedupFeeStructure, studentClassId: number | null): number {
  let score = 0;
  if (studentClassId != null && structure.class_id === studentClassId) {
    score += 1000;
  } else if (structure.class_id === null) {
    score += 100;
  }
  score += FREQUENCY_PRIORITY[structure.frequency] ?? 0;
  return score;
}

/** Pick the single best structure when multiple active rows exist for the same fee type. */
export function pickPreferredFeeStructure(
  structures: DedupFeeStructure[],
  studentClassId: number | null
): DedupFeeStructure {
  return [...structures].sort((a, b) => {
    const scoreDiff = structureScore(b, studentClassId) - structureScore(a, studentClassId);
    if (scoreDiff !== 0) return scoreDiff;
    return b.id - a.id;
  })[0];
}

/** One structure per fee type — class-specific beats school-wide; one_time beats yearly. */
export function dedupeStructuresForStudent<T extends DedupFeeStructure>(
  structures: T[],
  studentClassId: number | null
): T[] {
  const applicable = structures.filter(
    (fs) => fs.class_id === studentClassId || fs.class_id === null
  );

  const byFeeType = new Map<string, T[]>();
  for (const structure of applicable) {
    const key = feeTypeKey(structure.fee_type);
    const group = byFeeType.get(key) ?? [];
    group.push(structure);
    byFeeType.set(key, group);
  }

  const result: T[] = [];
  for (const group of byFeeType.values()) {
    result.push(pickPreferredFeeStructure(group, studentClassId) as T);
  }
  return result;
}

export function structurePreferenceOrderSql(
  structureAlias: string,
  studentAlias: string
): string {
  return `
    CASE
      WHEN ${structureAlias}.class_id = ${studentAlias}.class_id THEN 0
      WHEN ${structureAlias}.class_id IS NULL THEN 1
      ELSE 2
    END,
    CASE ${structureAlias}.frequency
      WHEN 'one_time' THEN 5
      WHEN 'yearly' THEN 4
      WHEN 'half_yearly' THEN 3
      WHEN 'quarterly' THEN 2
      WHEN 'monthly' THEN 1
      ELSE 0
    END DESC,
    ${structureAlias}.id DESC
  `;
}
