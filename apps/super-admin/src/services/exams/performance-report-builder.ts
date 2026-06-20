import { cbseGrade } from '@/lib/exam-grades';
import {
  buildResultMap,
  round1,
  scaleMarks,
  type ExamResultRow,
} from '@/lib/exam-results-query';

export type PerformanceReportType = 'term' | 'half_yearly' | 'annual';

export type PerformanceReportStudent = {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  date_of_birth: string | null;
  parent_name: string | null;
  mother_name: string | null;
  father_name: string | null;
  class_name: string;
  section_name: string | null;
  photo_url: string | null;
};

export type PerformanceReportSubject = {
  subject_id: number;
  subject_name: string;
  ut1?: number | null;
  sa_marks?: number | null;
  sa_weightage?: number | null;
  fa_weightage?: number | null;
  term_total?: number | null;
  hy_sa_marks?: number | null;
  hy_sa_weightage?: number | null;
  hy_fa_weightage?: number | null;
  hy_total?: number | null;
  half_grand_total?: number | null;
  term1_ut_fa?: number | null;
  term1_ut_sa?: number | null;
  term1_hy_fa?: number | null;
  term1_hy_sa?: number | null;
  term1_total?: number | null;
  term2_ut_fa?: number | null;
  term2_ut_sa?: number | null;
  term2_annual_fa?: number | null;
  term2_annual_sa?: number | null;
  term2_total?: number | null;
  grand_total?: number | null;
  grade: string;
};

export type PerformanceReportData = {
  student: PerformanceReportStudent;
  subjects: PerformanceReportSubject[];
  summary: {
    grand_total: number;
    max_total: number;
    percentage: number;
    overall_grade: string;
    attendance?: string | null;
    rank?: number | null;
  };
  report_type: PerformanceReportType;
  report_title: string;
  term_label?: string | null;
};

type SubjectRef = { subject_id: number; subject_name: string };

function pct(obt: number, max: number): number {
  return max > 0 ? (obt / max) * 100 : 0;
}

function splitUtMarks(obt: number, max: number) {
  const scaled = scaleMarks(obt, max, 20);
  return {
    fa: round1(scaled * 0.25),
    sa: round1(scaled * 0.75),
    total: scaled,
  };
}

function splitHyAnnualMarks(obt: number, max: number) {
  const scaled = scaleMarks(obt, max, 30);
  return {
    fa: round1(scaled * (5 / 30)),
    sa: round1(scaled * (25 / 30)),
    total: scaled,
  };
}

function buildTermSubject(row: ExamResultRow | undefined): PerformanceReportSubject | null {
  if (!row) return null;
  const saMarks = scaleMarks(row.marks_obtained, row.max_marks, 30);
  const saWeightage = round1(saMarks / 3);
  const faWeightage = scaleMarks(row.marks_obtained, row.max_marks, 10);
  const termTotal = round1(saWeightage + faWeightage);
  const grade = cbseGrade(pct(termTotal, 20)).grade;

  return {
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    sa_marks: saMarks,
    sa_weightage: saWeightage,
    fa_weightage: faWeightage,
    term_total: termTotal,
    grade,
  };
}

function buildHalfYearlySubject(
  hyRow: ExamResultRow | undefined,
  utRow: ExamResultRow | undefined,
): PerformanceReportSubject | null {
  if (!hyRow && !utRow) return null;
  const ut1 = utRow ? scaleMarks(utRow.marks_obtained, utRow.max_marks, 20) : 0;
  const hySaMarks = hyRow ? scaleMarks(hyRow.marks_obtained, hyRow.max_marks, 60) : 0;
  const hySaWeightage = round1(hySaMarks / 3);
  const hyFaWeightage = hyRow ? scaleMarks(hyRow.marks_obtained, hyRow.max_marks, 10) : 0;
  const hyTotal = round1(hySaWeightage + hyFaWeightage);
  const halfGrand = round1(ut1 + hyTotal);
  const grade = cbseGrade(pct(halfGrand, 50)).grade;

  return {
    subject_id: (hyRow || utRow)!.subject_id,
    subject_name: (hyRow || utRow)!.subject_name,
    ut1: utRow ? ut1 : null,
    hy_sa_marks: hyRow ? hySaMarks : null,
    hy_sa_weightage: hyRow ? hySaWeightage : null,
    hy_fa_weightage: hyRow ? hyFaWeightage : null,
    hy_total: hyRow ? hyTotal : null,
    half_grand_total: halfGrand,
    grade,
  };
}

function buildAnnualSubject(
  ut1: ExamResultRow | undefined,
  hy: ExamResultRow | undefined,
  ut2: ExamResultRow | undefined,
  annual: ExamResultRow | undefined,
): PerformanceReportSubject | null {
  if (!ut1 && !hy && !ut2 && !annual) return null;

  const ref = ut1 || hy || ut2 || annual!;
  let term1Total = 0;
  let term2Total = 0;

  let term1UtFa: number | null = null;
  let term1UtSa: number | null = null;
  let term1HyFa: number | null = null;
  let term1HySa: number | null = null;
  let term2UtFa: number | null = null;
  let term2UtSa: number | null = null;
  let term2AnnualFa: number | null = null;
  let term2AnnualSa: number | null = null;

  if (ut1) {
    const split = splitUtMarks(ut1.marks_obtained, ut1.max_marks);
    term1UtFa = split.fa;
    term1UtSa = split.sa;
    term1Total += split.total;
  }
  if (hy) {
    const split = splitHyAnnualMarks(hy.marks_obtained, hy.max_marks);
    term1HyFa = split.fa;
    term1HySa = split.sa;
    term1Total += split.total;
  }

  if (!ut1 && !hy && !ut2 && annual) {
    term2Total = scaleMarks(annual.marks_obtained, annual.max_marks, 100);
    term2AnnualFa = round1(term2Total * (5 / 30));
    term2AnnualSa = round1(term2Total - term2AnnualFa);
  } else {
    if (ut2) {
      const split = splitUtMarks(ut2.marks_obtained, ut2.max_marks);
      term2UtFa = split.fa;
      term2UtSa = split.sa;
      term2Total += split.total;
    }
    if (annual) {
      const split = splitHyAnnualMarks(annual.marks_obtained, annual.max_marks);
      term2AnnualFa = split.fa;
      term2AnnualSa = split.sa;
      term2Total += split.total;
    }
  }

  term1Total = round1(term1Total);
  term2Total = round1(term2Total);
  const grandTotal = round1(term1Total + term2Total);
  const grade = cbseGrade(pct(grandTotal, 100)).grade;

  return {
    subject_id: ref.subject_id,
    subject_name: ref.subject_name,
    term1_ut_fa: term1UtFa,
    term1_ut_sa: term1UtSa,
    term1_hy_fa: term1HyFa,
    term1_hy_sa: term1HySa,
    term1_total: term1Total || null,
    term2_ut_fa: term2UtFa,
    term2_ut_sa: term2UtSa,
    term2_annual_fa: term2AnnualFa,
    term2_annual_sa: term2AnnualSa,
    term2_total: term2Total || null,
    grand_total: grandTotal,
    grade,
  };
}

export function buildPerformanceReports(input: {
  reportType: PerformanceReportType;
  students: PerformanceReportStudent[];
  subjects: SubjectRef[];
  resultMaps: {
    exam?: Map<number, Map<number, ExamResultRow>>;
    unitTest?: Map<number, Map<number, ExamResultRow>>;
    halfYearly?: Map<number, Map<number, ExamResultRow>>;
    unitTest1?: Map<number, Map<number, ExamResultRow>>;
    unitTest2?: Map<number, Map<number, ExamResultRow>>;
    annual?: Map<number, Map<number, ExamResultRow>>;
  };
  reportTitle: string;
  termLabel?: string | null;
}): PerformanceReportData[] {
  const reports: PerformanceReportData[] = [];

  for (const student of input.students) {
    const sid = student.id;
    const subjectRows: PerformanceReportSubject[] = [];
    let grandTotal = 0;
    let maxTotal = 0;

    for (const sub of input.subjects) {
      let row: PerformanceReportSubject | null = null;

      if (input.reportType === 'term') {
        row = buildTermSubject(input.resultMaps.exam?.get(sid)?.get(sub.subject_id));
      } else if (input.reportType === 'half_yearly') {
        row = buildHalfYearlySubject(
          input.resultMaps.halfYearly?.get(sid)?.get(sub.subject_id),
          input.resultMaps.unitTest?.get(sid)?.get(sub.subject_id),
        );
      } else {
        row = buildAnnualSubject(
          input.resultMaps.unitTest1?.get(sid)?.get(sub.subject_id),
          input.resultMaps.halfYearly?.get(sid)?.get(sub.subject_id),
          input.resultMaps.unitTest2?.get(sid)?.get(sub.subject_id),
          input.resultMaps.annual?.get(sid)?.get(sub.subject_id),
        );
      }

      if (!row) continue;
      subjectRows.push(row);

      if (input.reportType === 'term') {
        grandTotal += row.term_total ?? 0;
        maxTotal += 20;
      } else if (input.reportType === 'half_yearly') {
        grandTotal += row.half_grand_total ?? 0;
        maxTotal += 50;
      } else {
        grandTotal += row.grand_total ?? 0;
        maxTotal += 100;
      }
    }

    if (subjectRows.length === 0) continue;

    const percentage = maxTotal > 0 ? round1((grandTotal / maxTotal) * 100) : 0;
    const overall = cbseGrade(percentage);

    reports.push({
      student,
      subjects: subjectRows,
      summary: {
        grand_total: round1(grandTotal),
        max_total: maxTotal,
        percentage,
        overall_grade: overall.grade,
      },
      report_type: input.reportType,
      report_title: input.reportTitle,
      term_label: input.termLabel,
    });
  }

  return reports;
}

export { buildResultMap };
