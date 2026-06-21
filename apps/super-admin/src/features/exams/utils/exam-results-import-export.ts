export interface ResultsTemplateStudent {
  id: number;
  first_name: string;
  last_name: string;
  roll_number: string;
  admission_number: string;
}

export interface ResultsTemplateSubject {
  subject_id: number;
  subject_name: string;
  total_marks: number;
  passing_marks: number;
}

export interface ResultInputRow {
  marks: string;
  absent: boolean;
  remarks: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function subjectMarksHeader(subjectName: string) {
  return `${subjectName} Marks`;
}

function subjectAbsentHeader(subjectName: string) {
  return `${subjectName} Absent`;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseAbsentValue(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'y' || v === 'yes' || v === 'true' || v === 'absent';
}

export function downloadResultsTemplate(
  examName: string,
  students: ResultsTemplateStudent[],
  subjects: ResultsTemplateSubject[],
) {
  const fixedHeaders = ['Admission Number', 'Roll Number', 'Student Name'];
  const subjectHeaders = subjects.flatMap((sub) => [
    subjectMarksHeader(sub.subject_name),
    subjectAbsentHeader(sub.subject_name),
  ]);
  const header = [...fixedHeaders, ...subjectHeaders].map(escapeCsvValue).join(',');

  const rows = students.map((student) => {
    const name = `${student.first_name} ${student.last_name}`.trim();
    const subjectCells = subjects.flatMap(() => ['', '']);
    return [student.admission_number, student.roll_number || '', name, ...subjectCells]
      .map(escapeCsvValue)
      .join(',');
  });

  const csv = `\uFEFF${[header, ...rows].join('\n')}`;
  const slug = examName.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 40) || 'exam';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slug}_results_template.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function parseResultsImportCsv(
  text: string,
  students: ResultsTemplateStudent[],
  subjects: ResultsTemplateSubject[],
  currentInputs: Record<number, Record<number, ResultInputRow>>,
): {
  inputs: Record<number, Record<number, ResultInputRow>>;
  matchedRows: number;
  skippedRows: number;
} {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { inputs: currentInputs, matchedRows: 0, skippedRows: 0 };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const headerMap = new Map(headers.map((h, i) => [normalizeKey(h), i]));

  const admissionIdx = headerMap.get(normalizeKey('Admission Number'));
  const rollIdx = headerMap.get(normalizeKey('Roll Number'));

  const subjectColumnMap = new Map<
    number,
    { marksIdx: number | undefined; absentIdx: number | undefined }
  >();

  for (const sub of subjects) {
    const marksKey = normalizeKey(subjectMarksHeader(sub.subject_name));
    const absentKey = normalizeKey(subjectAbsentHeader(sub.subject_name));
    subjectColumnMap.set(sub.subject_id, {
      marksIdx: headerMap.get(marksKey),
      absentIdx: headerMap.get(absentKey),
    });
  }

  const studentByAdmission = new Map(
    students.map((s) => [normalizeKey(s.admission_number), s]),
  );
  const studentByRoll = new Map(
    students.filter((s) => s.roll_number).map((s) => [normalizeKey(s.roll_number), s]),
  );

  const nextInputs: Record<number, Record<number, ResultInputRow>> = JSON.parse(
    JSON.stringify(currentInputs),
  );

  let matchedRows = 0;
  let skippedRows = 0;

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx += 1) {
    const cells = parseCsvLine(lines[lineIdx]);
    const admission = admissionIdx != null ? cells[admissionIdx]?.trim() : '';
    const roll = rollIdx != null ? cells[rollIdx]?.trim() : '';

    const student =
      (admission && studentByAdmission.get(normalizeKey(admission))) ||
      (roll && studentByRoll.get(normalizeKey(roll))) ||
      null;

    if (!student) {
      skippedRows += 1;
      continue;
    }

    matchedRows += 1;
    if (!nextInputs[student.id]) nextInputs[student.id] = {};

    for (const sub of subjects) {
      const cols = subjectColumnMap.get(sub.subject_id);
      const existing = nextInputs[student.id][sub.subject_id] || {
        marks: '',
        absent: false,
        remarks: '',
      };

      let marks = existing.marks;
      let absent = existing.absent;

      if (cols?.absentIdx != null) {
        const absentRaw = cells[cols.absentIdx]?.trim() ?? '';
        if (absentRaw !== '') absent = parseAbsentValue(absentRaw);
      }

      if (cols?.marksIdx != null) {
        const marksRaw = cells[cols.marksIdx]?.trim() ?? '';
        if (marksRaw !== '') {
          const num = parseFloat(marksRaw);
          if (!Number.isNaN(num)) {
            marks = String(Math.min(Math.max(0, num), sub.total_marks));
            absent = false;
          }
        }
      }

      nextInputs[student.id][sub.subject_id] = { ...existing, marks, absent };
    }
  }

  return { inputs: nextInputs, matchedRows, skippedRows };
}
