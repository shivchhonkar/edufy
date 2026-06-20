export type RankCandidate = {
  student_id: number;
  percentage: number;
  obtained_marks: number;
  first_name: string;
  last_name: string;
  class_id: number;
  section_id: number | null;
};

export type RankAssignment = {
  student_id: number;
  class_rank: number | null;
  section_rank: number | null;
  school_rank: number | null;
};

function compareCandidates(a: RankCandidate, b: RankCandidate): number {
  if (b.percentage !== a.percentage) return b.percentage - a.percentage;
  if (b.obtained_marks !== a.obtained_marks) return b.obtained_marks - a.obtained_marks;
  const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
  const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
  return nameA.localeCompare(nameB);
}

function assignDenseRanks(sorted: RankCandidate[]): Map<number, number> {
  const ranks = new Map<number, number>();
  let rank = 0;
  let prev: RankCandidate | null = null;

  for (const candidate of sorted) {
    if (
      !prev ||
      candidate.percentage !== prev.percentage ||
      candidate.obtained_marks !== prev.obtained_marks
    ) {
      rank += 1;
    }
    ranks.set(candidate.student_id, rank);
    prev = candidate;
  }
  return ranks;
}

/**
 * Class rank: within same class_id.
 * Section rank: within same class_id + section_id (null sections grouped together).
 * School rank: all candidates in the compile batch (typically one exam / one class scope).
 */
export function computeRanks(candidates: RankCandidate[]): RankAssignment[] {
  if (candidates.length === 0) return [];

  const schoolSorted = [...candidates].sort(compareCandidates);
  const schoolRanks = assignDenseRanks(schoolSorted);

  const byClass = new Map<number, RankCandidate[]>();
  const bySection = new Map<string, RankCandidate[]>();

  for (const c of candidates) {
    if (!byClass.has(c.class_id)) byClass.set(c.class_id, []);
    byClass.get(c.class_id)!.push(c);

    const sectionKey = `${c.class_id}:${c.section_id ?? 'none'}`;
    if (!bySection.has(sectionKey)) bySection.set(sectionKey, []);
    bySection.get(sectionKey)!.push(c);
  }

  const classRanks = new Map<number, number>();
  for (const [, group] of byClass) {
    const sorted = [...group].sort(compareCandidates);
    for (const [studentId, rank] of assignDenseRanks(sorted)) {
      classRanks.set(studentId, rank);
    }
  }

  const sectionRanks = new Map<number, number>();
  for (const [, group] of bySection) {
    const sorted = [...group].sort(compareCandidates);
    for (const [studentId, rank] of assignDenseRanks(sorted)) {
      sectionRanks.set(studentId, rank);
    }
  }

  return candidates.map((c) => ({
    student_id: c.student_id,
    class_rank: classRanks.get(c.student_id) ?? null,
    section_rank: c.section_id != null ? sectionRanks.get(c.student_id) ?? null : null,
    school_rank: schoolRanks.get(c.student_id) ?? null,
  }));
}

export function getTopPerformers<T extends { class_rank?: number | null; school_rank?: number | null; percentage?: number | string }>(
  rows: T[],
  rankField: 'class_rank' | 'school_rank',
  limit = 10,
): T[] {
  return [...rows]
    .filter((r) => r[rankField] != null)
    .sort((a, b) => Number(a[rankField]) - Number(b[rankField]))
    .slice(0, limit);
}
