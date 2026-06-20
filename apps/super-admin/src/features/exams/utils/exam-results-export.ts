import { HTML2PDF_PAGE_MARGIN_MM } from '@edulakhya/utils';

export interface ExamResultRow {
  id: number;
  student_id: number;
  subject_id?: number;
  subject_name?: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  admission_number: string;
  marks_obtained: number;
  grade: string;
  percentage: number;
  is_absent: boolean;
  remarks?: string;
}

export interface ExamExportContext {
  id: number;
  name: string;
  class_name: string;
  exam_type: string;
  exam_date: string;
  total_marks: number;
  passing_marks: number;
  subjects?: Array<{
    subject_id: number;
    subject_name: string;
    total_marks: number;
    passing_marks: number;
  }>;
}

export interface GroupedStudentResults {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string;
  results: ExamResultRow[];
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getSubjectPassingMarks(exam: ExamExportContext, subjectId?: number) {
  if (subjectId != null) {
    const subject = exam.subjects?.find((s) => s.subject_id === subjectId);
    if (subject) return subject.passing_marks;
  }
  return exam.passing_marks;
}

export function getResultStatus(result: ExamResultRow, exam: ExamExportContext) {
  if (result.is_absent) return 'Absent';
  const passing = getSubjectPassingMarks(exam, result.subject_id);
  return Number(result.marks_obtained) >= Number(passing) ? 'Pass' : 'Fail';
}

export function groupExamResultsByStudent(results: ExamResultRow[]): GroupedStudentResults[] {
  const map = new Map<number, GroupedStudentResults>();

  for (const result of results) {
    if (!map.has(result.student_id)) {
      map.set(result.student_id, {
        student_id: result.student_id,
        first_name: result.first_name,
        last_name: result.last_name,
        admission_number: result.admission_number,
        roll_number: result.roll_number,
        results: [],
      });
    }
    map.get(result.student_id)!.results.push(result);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      results: [...group.results].sort((a, b) =>
        (a.subject_name || '').localeCompare(b.subject_name || ''),
      ),
    }))
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
    );
}

function buildExportFilename(exam: ExamExportContext, extension: string) {
  const slug = exam.name.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 40);
  const date = new Date().toISOString().split('T')[0];
  return `${slug || 'exam'}_results_${date}.${extension}`;
}

export function downloadExamResultsExcel(results: ExamResultRow[], exam: ExamExportContext) {
  const grouped = groupExamResultsByStudent(results);
  const header = [
    'Student',
    'Roll No.',
    'Subject',
    'Marks',
    'Percentage',
    'Grade',
    'Status',
  ]
    .map(escapeCsvValue)
    .join(',');

  const rows: string[] = [];
  for (const group of grouped) {
    const studentName = `${group.first_name} ${group.last_name}`.trim();
    const studentLabel = group.admission_number
      ? `${studentName} (${group.admission_number})`
      : studentName;
    for (const result of group.results) {
      rows.push(
        [
          studentLabel,
          group.roll_number || '',
          result.subject_name || '',
          result.is_absent ? '' : result.marks_obtained,
          result.is_absent ? '' : `${result.percentage}%`,
          result.is_absent ? '' : result.grade,
          getResultStatus(result, exam),
        ]
          .map(escapeCsvValue)
          .join(','),
      );
    }
  }

  const csv = `\uFEFF${[header, ...rows].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildExportFilename(exam, 'csv');
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function buildPdfTableHtml(grouped: GroupedStudentResults[], exam: ExamExportContext) {
  const bodyRows = grouped
    .map((group) => {
      const studentName = escapeHtml(`${group.first_name} ${group.last_name}`.trim());
      const admission = group.admission_number
        ? `<div style="font-size:8pt;color:#666;margin-top:2px;">${escapeHtml(group.admission_number)}</div>`
        : '';
      return group.results
        .map((result, index) => {
          const status = getResultStatus(result, exam);
          const marks = result.is_absent ? '—' : escapeHtml(result.marks_obtained);
          const pct = result.is_absent ? '—' : `${escapeHtml(result.percentage)}%`;
          const grade = result.is_absent ? '—' : escapeHtml(result.grade);
          return `<tr>
            ${
              index === 0
                ? `<td rowspan="${group.results.length}" style="text-align:center;vertical-align:middle;font-weight:600;border:1px solid #ccc;padding:6px;">${studentName}${admission}</td>`
                : ''
            }
            <td style="border:1px solid #ccc;padding:6px;">${escapeHtml(result.subject_name || '—')}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${marks}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${pct}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${grade}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${escapeHtml(status)}</td>
          </tr>`;
        })
        .join('');
    })
    .join('');

  const examDate = exam.exam_date
    ? new Date(exam.exam_date).toLocaleDateString('en-IN')
    : '—';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111;padding:8px;">
      <h2 style="margin:0 0 4px;font-size:16pt;">${escapeHtml(exam.name)}</h2>
      <p style="margin:0 0 12px;color:#444;font-size:9pt;">
        Class: ${escapeHtml(exam.class_name)} · Exam date: ${escapeHtml(examDate)}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Student</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">Subject</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Marks</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">%</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Grade</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

export async function downloadExamResultsPdf(results: ExamResultRow[], exam: ExamExportContext) {
  const grouped = groupExamResultsByStudent(results);
  const container = document.createElement('div');
  container.innerHTML = buildPdfTableHtml(grouped, exam);
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: HTML2PDF_PAGE_MARGIN_MM,
        filename: buildExportFilename(exam, 'pdf'),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      })
      .from(container.firstElementChild as HTMLElement)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
