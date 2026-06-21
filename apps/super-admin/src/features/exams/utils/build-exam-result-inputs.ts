export type ExamResultInput = {
  marks: string;
  absent: boolean;
  remarks: string;
};

export type ExamResultSeed = {
  student_id: number | string;
  subject_id?: number | string | null;
  subject_name?: string | null;
  marks_obtained: number | string;
  is_absent: boolean;
  remarks?: string | null;
};

export type ExamSubjectSeed = {
  subject_id: number;
  subject_name: string;
  total_marks: number;
  passing_marks: number;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeSubjectName(name: string | null | undefined) {
  return (name || '').trim().toLowerCase();
}

function formatMarks(value: number | string | null | undefined, isAbsent: boolean): string {
  if (isAbsent) return '';
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return String(num);
}

export function buildExamResultInputs(
  students: Array<{ id: number | string }>,
  examSubjects: ExamSubjectSeed[],
  results: ExamResultSeed[],
): Record<number, Record<number, ExamResultInput>> {
  const byStudentSubject = new Map<string, ExamResultSeed>();
  const byStudentSubjectName = new Map<string, ExamResultSeed>();
  const byStudentLegacy = new Map<number, ExamResultSeed>();

  for (const row of results) {
    const studentId = toNumber(row.student_id);
    if (studentId == null) continue;

    const subjectId = toNumber(row.subject_id);
    if (subjectId != null) {
      byStudentSubject.set(`${studentId}:${subjectId}`, row);
    } else {
      byStudentLegacy.set(studentId, row);
    }

    const subjectName = normalizeSubjectName(row.subject_name);
    if (subjectName) {
      byStudentSubjectName.set(`${studentId}:${subjectName}`, row);
    }
  }

  const isSingleSubject = examSubjects.length === 1;
  const inputs: Record<number, Record<number, ExamResultInput>> = {};

  for (const student of students) {
    const studentId = toNumber(student.id);
    if (studentId == null) continue;

    inputs[studentId] = {};

    for (const sub of examSubjects) {
      const subjectId = toNumber(sub.subject_id);
      if (subjectId == null) continue;

      const match =
        byStudentSubject.get(`${studentId}:${subjectId}`) ??
        byStudentSubjectName.get(`${studentId}:${normalizeSubjectName(sub.subject_name)}`) ??
        (isSingleSubject ? byStudentLegacy.get(studentId) : undefined);

      inputs[studentId][subjectId] = {
        marks: match ? formatMarks(match.marks_obtained, Boolean(match.is_absent)) : '',
        absent: match ? Boolean(match.is_absent) : false,
        remarks: match?.remarks ? String(match.remarks) : '',
      };
    }
  }

  return inputs;
}

export function mergeExamSubjectsFromResults(
  examSubjects: ExamSubjectSeed[],
  results: ExamResultSeed[],
  examFallback?: { subject_id?: number; subject_name?: string; total_marks: number; passing_marks: number },
): ExamSubjectSeed[] {
  const merged = new Map<number, ExamSubjectSeed>();
  for (const sub of examSubjects) {
    const id = toNumber(sub.subject_id);
    if (id != null) merged.set(id, { ...sub, subject_id: id });
  }

  for (const row of results) {
    const subjectId = toNumber(row.subject_id);
    if (subjectId == null || merged.has(subjectId)) continue;
    merged.set(subjectId, {
      subject_id: subjectId,
      subject_name: row.subject_name || `Subject ${subjectId}`,
      total_marks: examFallback?.total_marks ?? 100,
      passing_marks: examFallback?.passing_marks ?? 33,
    });
  }

  if (merged.size === 0 && examFallback?.subject_id) {
    merged.set(examFallback.subject_id, {
      subject_id: examFallback.subject_id,
      subject_name: examFallback.subject_name || 'Subject',
      total_marks: examFallback.total_marks,
      passing_marks: examFallback.passing_marks,
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
}
