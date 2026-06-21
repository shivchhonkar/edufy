import { HTML2PDF_PAGE_MARGIN_MM } from '@edulakhya/utils';

export interface CalendarDailyRecord {
  student_id: number;
  date: string;
  status: string;
}

export interface CalendarStudentSource {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  attendance_percentage: number;
}

export interface CalendarReportSummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  half_day: number;
  total_marked: number;
  attendance_percentage: number;
}

export interface CalendarExportContext {
  month: number;
  year: number;
  monthLabel: string;
  classLabel: string;
  summary: CalendarReportSummary | null;
  daysInMonth: number;
  school: CalendarSchoolInfo;
  students: Array<{
    student_id: number;
    name: string;
    days: string[];
    percentage: number;
  }>;
}

export interface CalendarSchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

const STATUS_CODES: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  on_leave: 'O',
  half_day: 'H',
};

const LEGEND = [
  { code: 'P', label: 'Present' },
  { code: 'A', label: 'Absent' },
  { code: 'L', label: 'Late' },
  { code: 'O', label: 'On Leave' },
  { code: 'H', label: 'Half Day' },
  { code: '-', label: 'Not marked' },
];

/** Fallback cap when page-fit calculation is unavailable. */
export const CALENDAR_PRINT_STUDENTS_PER_JOB = 20;

const PRINT_LAYOUT_MM = {
  pageHeight: 210,
  margin: 12,
  schoolHeader: 40,
  overview: 26,
  metaRow: 10,
  tableHeader: 7,
  legend: 7,
  row: 5,
  minRows: 8,
  maxRows: 22,
};

export interface CalendarPrintPlan {
  totalStudents: number;
  studentsPerJob: number;
  firstBatchSize: number;
  subsequentBatchSize: number;
  batchCount: number;
  needsBatching: boolean;
  batchSizes: number[];
  daysInMonth: number;
}

export interface CalendarReportHtmlOptions {
  students?: CalendarExportContext['students'];
  batchIndex?: number;
  batchTotal?: number;
  includeOverview?: boolean;
  showReportLabels?: boolean;
}

export interface CalendarPrintProgress {
  batchIndex: number;
  batchTotal: number;
  studentCount: number;
  totalStudents: number;
}

export type BatchPrintPromptResult = 'continue' | 'exit';

export interface BatchPrintPromptRequest {
  batchIndex: number;
  batchTotal: number;
  studentCount: number;
  totalStudents: number;
  studentsPerJob: number;
  studentRangeStart: number;
  studentRangeEnd: number;
  isFirstBatch: boolean;
  printPlan: CalendarPrintPlan;
}

/** Estimate student rows that fit on one A4 landscape print page. */
export function calculateStudentsPerPrintPage(options: {
  daysInMonth: number;
  includeOverview: boolean;
}): number {
  const {
    pageHeight,
    margin,
    schoolHeader,
    overview,
    metaRow,
    tableHeader,
    legend,
    row,
    minRows,
    maxRows,
  } = PRINT_LAYOUT_MM;

  let reserved = schoolHeader + metaRow + tableHeader + legend;
  if (options.includeOverview) reserved += overview;

  // Wider month grids (31 day columns) stress the print engine — reserve fewer rows.
  const widthPenalty =
    options.daysInMonth >= 31 ? 4 : options.daysInMonth >= 30 ? 2 : 0;

  const usableHeight = pageHeight - margin;
  const rows = Math.floor((usableHeight - reserved) / row) - widthPenalty;

  return Math.max(minRows, Math.min(maxRows, rows));
}

function buildPrintBatchSizes(
  totalStudents: number,
  firstBatchSize: number,
  subsequentBatchSize: number,
): number[] {
  if (totalStudents <= 0) return [];
  if (totalStudents <= firstBatchSize) return [totalStudents];

  const sizes = [firstBatchSize];
  let remaining = totalStudents - firstBatchSize;

  while (remaining > 0) {
    sizes.push(Math.min(subsequentBatchSize, remaining));
    remaining -= sizes[sizes.length - 1];
  }

  return sizes;
}

function chunkStudentsByBatchSizes<T>(students: T[], batchSizes: number[]): T[][] {
  const batches: T[][] = [];
  let offset = 0;

  for (const size of batchSizes) {
    batches.push(students.slice(offset, offset + size));
    offset += size;
  }

  if (offset !== students.length) {
    throw new Error(
      `Print batch sizing mismatch: expected ${students.length} students, allocated ${offset}.`,
    );
  }

  return batches;
}

export function getCalendarPrintPlan(
  totalStudents: number,
  daysInMonth: number,
): CalendarPrintPlan {
  const studentsPerPage = calculateStudentsPerPrintPage({
    daysInMonth,
    includeOverview: false,
  });
  const batchSizes = buildPrintBatchSizes(totalStudents, studentsPerPage, studentsPerPage);

  return {
    totalStudents,
    daysInMonth,
    firstBatchSize: studentsPerPage,
    subsequentBatchSize: studentsPerPage,
    studentsPerJob: studentsPerPage,
    batchCount: batchSizes.length,
    needsBatching: batchSizes.length > 1,
    batchSizes,
  };
}

export function buildCalendarPrintSummaryMessage(plan: CalendarPrintPlan) {
  if (!plan.needsBatching) {
    return `This report has ${plan.totalStudents} student(s) and fits on one print page.`;
  }

  return `This report has ${plan.totalStudents} students. Printing will run in ${plan.batchCount} parts (${plan.studentsPerJob} students per part).`;
}

export function buildCalendarPrintWarning(plan: CalendarPrintPlan) {
  return (
    `This report has ${plan.totalStudents} students, which exceeds the recommended limit of ${plan.studentsPerJob} per print job.\n\n` +
    `It will be printed in ${plan.batchCount} separate parts. Each part opens its own print dialog.\n\n` +
    `Continue and print all ${plan.batchCount} parts?`
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsvValue(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toAbsoluteUrl(url?: string | null) {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function getSundayDayNumbers(month: number, year: number, daysInMonth: number) {
  const sundays = new Set<number>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month - 1, day).getDay() === 0) {
      sundays.add(day);
    }
  }
  return sundays;
}

const SUNDAY_COLUMN_BG = '#e5e7eb';

function buildSchoolHeaderHtml(school: CalendarSchoolInfo, showReportLabels = true) {
  const logoUrl = toAbsoluteUrl(school.logoUrl);
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" style="width:56px;height:56px;object-fit:contain;flex-shrink:0;" />`
    : `<div style="width:56px;height:56px;border:1px solid #d1d5db;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:700;color:#6b7280;flex-shrink:0;">${escapeHtml((school.name || 'S').charAt(0))}</div>`;

  const schoolName = escapeHtml(school.name || 'School');
  const addressLine = school.address?.trim() ? escapeHtml(school.address.trim()) : '';

  const contactRowParts: string[] = [];
  if (school.phone?.trim()) contactRowParts.push(`Phone: ${escapeHtml(school.phone.trim())}`);
  if (school.email?.trim()) contactRowParts.push(`Email: ${escapeHtml(school.email.trim())}`);

  const reportLabels = showReportLabels
    ? `<div style="font-size:10pt;font-weight:600;margin-top:5px;">Student Attendance Report</div>
        <div style="font-size:8pt;color:#6b7280;margin-top:2px;">Calendar View · Summary View · Analytics</div>`
    : '';

  if (!showReportLabels) {
    return `
    <header style="margin-bottom:6px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        ${logoBlock}
        <div style="flex:1;min-width:0;text-align:center;">
          <div style="font-size:14pt;font-weight:700;text-transform:uppercase;line-height:1.25;">${schoolName}</div>
          ${addressLine ? `<div style="font-size:8pt;color:#4b5563;margin-top:3px;line-height:1.35;">${addressLine}</div>` : ''}
        </div>
        <div style="width:56px;flex-shrink:0;" aria-hidden="true"></div>
      </div>
      ${
        contactRowParts.length
          ? `<div style="text-align:center;font-size:8pt;color:#4b5563;margin-top:4px;line-height:1.35;">${contactRowParts.join(' &nbsp;|&nbsp; ')}</div>`
          : ''
      }
    </header>`;
  }

  const legacyContactParts: string[] = [];
  if (addressLine) legacyContactParts.push(addressLine);
  if (school.phone?.trim()) legacyContactParts.push(`Tel: ${escapeHtml(school.phone.trim())}`);
  if (school.email?.trim()) legacyContactParts.push(escapeHtml(school.email.trim()));

  return `
    <header style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #d1d5db;">
      ${logoBlock}
      <div style="flex:1;min-width:0;text-align:center;">
        <div style="font-size:14pt;font-weight:700;text-transform:uppercase;line-height:1.25;">${schoolName}</div>
        ${legacyContactParts.length ? `<div style="font-size:8pt;color:#4b5563;margin-top:3px;line-height:1.35;">${legacyContactParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
        ${reportLabels}
      </div>
      <div style="width:56px;flex-shrink:0;" aria-hidden="true"></div>
    </header>`;
}

const CALENDAR_PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 3mm 5mm;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 landscape;
    margin: 0;
  }
  @media print {
    html, body {
      padding: 3mm 5mm;
    }
  }
  .attendance-print-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .attendance-print-table {
    page-break-inside: auto;
  }
  .attendance-sunday-col {
    background-color: ${SUNDAY_COLUMN_BG} !important;
  }
`;

export function statusToCalendarCode(status: string) {
  return STATUS_CODES[status] ?? '-';
}

export function formatClassSectionLabel(
  className?: string,
  sectionName?: string,
  fallback = 'All Classes',
) {
  if (!className && !sectionName) return fallback;
  const compactClass = (className ?? '').replace(/^class\s+/i, '').trim();
  if (sectionName) {
    const section = sectionName.trim();
    return compactClass ? `${compactClass}${section}` : section;
  }
  return className ?? fallback;
}

export function getMonthLabel(month: number) {
  return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
}

export function buildCalendarExportContext(
  students: CalendarStudentSource[],
  dailyRecords: CalendarDailyRecord[],
  month: number,
  year: number,
  classLabel: string,
  summary: CalendarReportSummary | null,
  school: CalendarSchoolInfo,
): CalendarExportContext {
  const daysInMonth = new Date(year, month, 0).getDate();
  const attendanceByStudent = new Map<number, Map<number, string>>();

  for (const record of dailyRecords) {
    const day = new Date(record.date).getDate();
    if (Number.isNaN(day)) continue;
    const byDay = attendanceByStudent.get(record.student_id) ?? new Map<number, string>();
    byDay.set(day, statusToCalendarCode(record.status));
    attendanceByStudent.set(record.student_id, byDay);
  }

  return {
    month,
    year,
    monthLabel: getMonthLabel(month),
    classLabel,
    summary,
    school,
    daysInMonth,
    students: students.map((student) => {
      const byDay = attendanceByStudent.get(student.student_id);
      const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        return byDay?.get(day) ?? '-';
      });
      return {
        student_id: student.student_id,
        name: `${student.first_name} ${student.last_name}`.trim(),
        days,
        percentage: student.attendance_percentage,
      };
    }),
  };
}

function buildOverviewCardsHtml(summary: CalendarReportSummary | null) {
  if (!summary) {
    return '<p style="font-size:9pt;color:#666;margin:0;">No summary data available.</p>';
  }

  const cards = [
    { label: 'Total Students', value: String(summary.total_students) },
    { label: 'Attendance %', value: `${summary.attendance_percentage}%` },
    { label: 'Present', value: String(summary.present) },
    { label: 'Absent', value: String(summary.absent) },
    { label: 'Late', value: String(summary.late) },
  ];

  return `
    <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:10px;">
      ${cards
        .map(
          (card) => `
        <div style="border:1px solid #d1d5db;border-radius:6px;padding:6px 8px;background:#f9fafb;">
          <div style="font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(card.label)}</div>
          <div style="font-size:12pt;font-weight:700;color:#111827;margin-top:2px;">${escapeHtml(card.value)}</div>
        </div>`,
        )
        .join('')}
    </div>`;
}

export function buildCalendarReportHtml(
  context: CalendarExportContext,
  options: CalendarReportHtmlOptions = {},
) {
  const students = options.students ?? context.students;
  const includeOverview = options.includeOverview ?? false;
  const showReportLabels = options.showReportLabels ?? true;
  const isPrintLayout = !showReportLabels;
  const sundays = getSundayDayNumbers(context.month, context.year, context.daysInMonth);

  const dayCellStyle = (day: number) => {
    const sundayBg = sundays.has(day) ? `background:${SUNDAY_COLUMN_BG};` : '';
    return `border:1px solid #ccc;padding:2px;font-size:7pt;text-align:center;font-weight:600;${sundayBg}`;
  };

  const dayHeaders = Array.from({ length: context.daysInMonth }, (_, index) => index + 1)
    .map((day) => {
      const sundayClass = sundays.has(day) ? ' class="attendance-sunday-col"' : '';
      return `<th${sundayClass} style="${dayCellStyle(day)}min-width:14px;">${day}</th>`;
    })
    .join('');

  const bodyRows = students
    .map((student) => {
      const dayCells = student.days
        .map((code, index) => {
          const day = index + 1;
          const sundayClass = sundays.has(day) ? ' class="attendance-sunday-col"' : '';
          return `<td${sundayClass} style="${dayCellStyle(day)}">${escapeHtml(code)}</td>`;
        })
        .join('');
      return `
        <tr class="attendance-print-row">
          <td style="border:1px solid #ccc;padding:3px 6px;font-size:8pt;white-space:nowrap;height:5mm;">${escapeHtml(student.name)}</td>
          ${dayCells}
          <td style="border:1px solid #ccc;padding:3px 6px;font-size:8pt;text-align:center;font-weight:700;">${student.percentage}%</td>
        </tr>`;
    })
    .join('');

  const legend = LEGEND.map((item) => `${item.code} = ${item.label}`).join(' · ');
  const metaRowStyle = isPrintLayout
    ? 'display:flex;justify-content:space-between;gap:12px;font-size:9pt;font-weight:600;padding:4px 0;margin-bottom:6px;'
    : 'display:flex;justify-content:space-between;gap:12px;font-size:9pt;font-weight:600;border-top:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:6px 0;margin-bottom:8px;';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:0;">
      ${buildSchoolHeaderHtml(context.school, showReportLabels)}
      ${includeOverview ? buildOverviewCardsHtml(context.summary) : ''}

      <div style="${metaRowStyle}">
        <span>Class : ${escapeHtml(context.classLabel)}</span>
        <span>Month : ${escapeHtml(context.monthLabel)} ${context.year}</span>
      </div>

      <table class="attendance-print-table" style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="border:1px solid #ccc;padding:4px 6px;font-size:8pt;text-align:left;width:120px;">Student Name</th>
            ${dayHeaders}
            <th style="border:1px solid #ccc;padding:4px 6px;font-size:8pt;text-align:center;width:36px;">%</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>

      <p style="font-size:7pt;color:#6b7280;margin-top:8px;">${escapeHtml(legend)}</p>
    </div>`;
}

export function buildCalendarExportFilename(context: CalendarExportContext, ext: string) {
  const monthPart = String(context.month).padStart(2, '0');
  const classPart = context.classLabel.replace(/[^\w.-]+/g, '-').toLowerCase();
  return `student-attendance-${classPart}-${context.year}-${monthPart}.${ext}`;
}

export function downloadCalendarExcel(context: CalendarExportContext) {
  const dayHeaders = Array.from({ length: context.daysInMonth }, (_, index) => String(index + 1));
  const headerRow = ['Student Name', ...dayHeaders, '%'].join(',');
  const rows = context.students.map((student) =>
    [escapeCsvValue(student.name), ...student.days, `${student.percentage}%`].join(','),
  );

  const metaRows = [
    context.school.name || 'School',
    ...(context.school.address?.trim() ? [context.school.address.trim()] : []),
    'Student Attendance Report',
    'Calendar View | Summary View | Analytics',
    `Class : ${escapeCsvValue(context.classLabel)}`,
    `Month : ${escapeCsvValue(`${context.monthLabel} ${context.year}`)}`,
    '',
  ];

  if (context.summary) {
    metaRows.push(
      `Total Students,${context.summary.total_students}`,
      `Attendance %,${context.summary.attendance_percentage}%`,
      `Present,${context.summary.present}`,
      `Absent,${context.summary.absent}`,
      `Late,${context.summary.late}`,
      '',
    );
  }

  const csv = [...metaRows, headerRow, ...rows].join('\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildCalendarExportFilename(context, 'csv');
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadCalendarPdf(context: CalendarExportContext) {
  const container = document.createElement('div');
  container.innerHTML = buildCalendarReportHtml(context, {
    includeOverview: true,
    showReportLabels: true,
  });
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '297mm';
  document.body.appendChild(container);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: HTML2PDF_PAGE_MARGIN_MM,
        filename: buildCalendarExportFilename(context, 'pdf'),
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

function buildCalendarPrintDocumentHtml(
  context: CalendarExportContext,
  options: CalendarReportHtmlOptions = {},
) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>&#8203;</title>
    <style>${CALENDAR_PRINT_STYLES}</style>
  </head>
  <body>${buildCalendarReportHtml(context, options)}</body>
</html>`;
}

function printHtmlInIframe(html: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1;';

    document.body.appendChild(iframe);

    let finished = false;
    let fallbackTimer: number | null = null;
    let safetyTimeout: number | null = null;
    let afterPrintHandler: (() => void) | null = null;

    const cleanup = () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      if (safetyTimeout !== null) window.clearTimeout(safetyTimeout);
      signal?.removeEventListener('abort', onAbort);
      if (afterPrintHandler) {
        iframe.contentWindow?.removeEventListener('afterprint', afterPrintHandler);
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      iframe.remove();
      resolve();
    };

    const onAbort = () => finish();
    signal?.addEventListener('abort', onAbort, { once: true });

    const printFrame = iframe.contentWindow;
    if (!printFrame) {
      finish();
      return;
    }

    let started = false;
    const triggerPrint = () => {
      if (started || finished) return;
      started = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      printFrame.focus();
      safetyTimeout = window.setTimeout(finish, 120000);
      afterPrintHandler = () => {
        if (safetyTimeout !== null) {
          window.clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        finish();
      };
      printFrame.addEventListener('afterprint', afterPrintHandler, { once: true });
      printFrame.print();
    };

    iframe.onload = () => {
      if (finished) return;

      const printDoc = printFrame.document;
      const images = Array.from(printDoc.images);
      if (images.length === 0) {
        triggerPrint();
        return;
      }

      let loaded = 0;
      const onImageDone = () => {
        loaded += 1;
        if (loaded >= images.length) triggerPrint();
      };

      for (const img of images) {
        if (img.complete) {
          onImageDone();
        } else {
          img.addEventListener('load', onImageDone, { once: true });
          img.addEventListener('error', onImageDone, { once: true });
        }
      }

      fallbackTimer = window.setTimeout(triggerPrint, 2500);
    };

    iframe.srcdoc = html;
  });
}

export async function printCalendarReport(
  context: CalendarExportContext,
  options?: {
    onProgress?: (progress: CalendarPrintProgress) => void;
    promptBatch?: (request: BatchPrintPromptRequest) => Promise<BatchPrintPromptResult>;
    signal?: AbortSignal;
  },
) {
  const plan = getCalendarPrintPlan(context.students.length, context.daysInMonth);
  const batches = chunkStudentsByBatchSizes(context.students, plan.batchSizes);
  let studentOffset = 0;

  for (let index = 0; index < batches.length; index += 1) {
    if (options?.signal?.aborted) break;

    const batchIndex = index + 1;
    const students = batches[index];
    const studentRangeStart = studentOffset + 1;
    const studentRangeEnd = studentOffset + students.length;

    if (plan.needsBatching) {
      const decision =
        (await options?.promptBatch?.({
          batchIndex,
          batchTotal: batches.length,
          studentCount: students.length,
          totalStudents: context.students.length,
          studentsPerJob: plan.studentsPerJob,
          studentRangeStart,
          studentRangeEnd,
          isFirstBatch: batchIndex === 1,
          printPlan: plan,
        })) ?? 'continue';

      if (decision === 'exit' || options?.signal?.aborted) break;
    }

    options?.onProgress?.({
      batchIndex,
      batchTotal: batches.length,
      studentCount: students.length,
      totalStudents: context.students.length,
    });

    const html = buildCalendarPrintDocumentHtml(context, {
      students,
      batchIndex,
      batchTotal: batches.length,
      includeOverview: false,
      showReportLabels: false,
    });

    await printHtmlInIframe(html, options?.signal);
    if (options?.signal?.aborted) break;

    studentOffset = studentRangeEnd;
  }
}

export async function fetchMonthlyDailyRecords(params: {
  month: number;
  year: number;
  classId?: string;
  sectionId?: string;
}): Promise<CalendarDailyRecord[]> {
  const start = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
  const lastDay = new Date(params.year, params.month, 0).getDate();
  const end = `${params.year}-${String(params.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const search = new URLSearchParams({ start_date: start, end_date: end });
  if (params.classId) search.set('class_id', params.classId);
  if (params.sectionId) search.set('section_id', params.sectionId);

  const response = await fetch(`/api/attendance/students?${search.toString()}`);
  const data = await response.json();
  if (!data.success) return [];

  return (data.data as CalendarDailyRecord[]).map((row) => ({
    student_id: row.student_id,
    date: row.date,
    status: row.status,
  }));
}
