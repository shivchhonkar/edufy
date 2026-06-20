import type { RequestDb } from '@/lib/request-db';
import type { GradingConfigRow } from '@/lib/ensure-exam-result-engine';

export type GradeInfo = {
  grade: string;
  grade_point: number | null;
  remarks: string;
};

/** CBSE default scale — used when grading_config table is empty. */
export const DEFAULT_GRADING_SCALE: Omit<GradingConfigRow, 'id' | 'is_active'>[] = [
  { min_percentage: 91, max_percentage: 100, grade: 'A1', grade_point: 10, remarks: 'EXCELLENT', sort_order: 8 },
  { min_percentage: 81, max_percentage: 90.99, grade: 'A2', grade_point: 9, remarks: 'VERY GOOD', sort_order: 7 },
  { min_percentage: 71, max_percentage: 80.99, grade: 'B1', grade_point: 8, remarks: 'GOOD', sort_order: 6 },
  { min_percentage: 61, max_percentage: 70.99, grade: 'B2', grade_point: 7, remarks: 'FAIR', sort_order: 5 },
  { min_percentage: 51, max_percentage: 60.99, grade: 'C1', grade_point: 6, remarks: 'SATISFACTORY', sort_order: 4 },
  { min_percentage: 41, max_percentage: 50.99, grade: 'C2', grade_point: 5, remarks: 'AVERAGE', sort_order: 3 },
  { min_percentage: 33, max_percentage: 40.99, grade: 'D', grade_point: 4, remarks: 'NEEDS IMPROVEMENT', sort_order: 2 },
  { min_percentage: 0, max_percentage: 32.99, grade: 'E', grade_point: 0, remarks: 'NEEDS IMPROVEMENT', sort_order: 1 },
];

let scaleCache: GradingConfigRow[] | null = null;
let scaleCacheAt = 0;
const CACHE_TTL_MS = 60_000;

export async function loadGradingScale(db: RequestDb): Promise<GradingConfigRow[]> {
  const now = Date.now();
  if (scaleCache && now - scaleCacheAt < CACHE_TTL_MS) return scaleCache;

  const result = await db.query<GradingConfigRow>(
    `SELECT id, min_percentage, max_percentage, grade, grade_point, remarks, sort_order, is_active
     FROM grading_config
     WHERE is_active = true
     ORDER BY sort_order DESC, min_percentage DESC`,
  );

  if (result.rows.length === 0) {
    scaleCache = DEFAULT_GRADING_SCALE.map((row, i) => ({
      ...row,
      id: i + 1,
      is_active: true,
    }));
  } else {
    scaleCache = result.rows;
  }
  scaleCacheAt = now;
  return scaleCache;
}

export function invalidateGradingScaleCache(): void {
  scaleCache = null;
  scaleCacheAt = 0;
}

export function gradeFromPercentage(
  percentage: number,
  scale: GradingConfigRow[],
): GradeInfo {
  const pct = Math.max(0, Math.min(100, percentage));
  for (const row of scale) {
    const min = parseFloat(String(row.min_percentage));
    const max = parseFloat(String(row.max_percentage));
    if (pct >= min && pct <= max) {
      return {
        grade: row.grade,
        grade_point: row.grade_point != null ? parseFloat(String(row.grade_point)) : null,
        remarks: row.remarks || '',
      };
    }
  }
  return { grade: 'E', grade_point: 0, remarks: 'NEEDS IMPROVEMENT' };
}

export function overallGradeLabel(percentage: number, scale?: GradingConfigRow[]): string {
  const { grade, remarks } = scale
    ? gradeFromPercentage(percentage, scale)
    : gradeFromPercentage(percentage, DEFAULT_GRADING_SCALE.map((r, i) => ({ ...r, id: i + 1, is_active: true })));
  return remarks ? `${grade} (${remarks})` : grade;
}

/** Legacy alias — all consumers should migrate to gradeFromPercentage. */
export function cbseGrade(percentage: number): { grade: string; remarks: string } {
  const info = gradeFromPercentage(
    percentage,
    DEFAULT_GRADING_SCALE.map((r, i) => ({ ...r, id: i + 1, is_active: true })),
  );
  return { grade: info.grade, remarks: info.remarks };
}

export const CBSE_GRADE_SCALE = DEFAULT_GRADING_SCALE.map((row) => ({
  grade: row.grade,
  range: `${row.min_percentage} – ${row.max_percentage}`,
  remarks: row.remarks || '',
}));

export type SubjectMarkInput = {
  subject_id: number;
  marks_obtained: number;
  max_marks: number;
  passing_marks: number;
  is_absent: boolean;
};

export type PassFailResult = {
  total_subjects: number;
  passed_subjects: number;
  failed_subjects: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  overall_grade: string;
  result_status: 'PASS' | 'FAIL';
};

/**
 * Student passes only if every subject >= passing marks (or not absent with 0)
 * AND overall percentage >= minimum threshold.
 */
export function evaluateStudentResult(
  subjects: SubjectMarkInput[],
  minimumOverallPercentage: number,
  scale: GradingConfigRow[],
): PassFailResult {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let passedSubjects = 0;
  let failedSubjects = 0;

  for (const sub of subjects) {
    totalMarks += sub.max_marks;
    if (sub.is_absent) {
      failedSubjects += 1;
      continue;
    }
    obtainedMarks += sub.marks_obtained;
    if (sub.marks_obtained >= sub.passing_marks) {
      passedSubjects += 1;
    } else {
      failedSubjects += 1;
    }
  }

  const totalSubjects = subjects.length;
  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const { grade } = gradeFromPercentage(percentage, scale);

  const allSubjectsPassed = failedSubjects === 0 && totalSubjects > 0;
  const meetsOverall = percentage >= minimumOverallPercentage;
  const result_status: 'PASS' | 'FAIL' =
    allSubjectsPassed && meetsOverall ? 'PASS' : 'FAIL';

  return {
    total_subjects: totalSubjects,
    passed_subjects: passedSubjects,
    failed_subjects: failedSubjects,
    total_marks: totalMarks,
    obtained_marks: obtainedMarks,
    percentage,
    overall_grade: grade,
    result_status,
  };
}

/** Calculate grade for a single subject row (used when saving exam_results). */
export async function gradeForSubjectMarks(
  db: RequestDb,
  marksObtained: number,
  totalMarks: number,
): Promise<string> {
  if (totalMarks <= 0) return 'E';
  const scale = await loadGradingScale(db);
  return gradeFromPercentage((marksObtained / totalMarks) * 100, scale).grade;
}
