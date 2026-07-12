import {
  documentStatusCssClass,
  documentStatusLabel,
  DOCUMENT_REPORT_COLUMN_LABELS,
  DOCUMENT_REPORT_PRINT_STATUS_CSS,
  getDocumentStatusStyle,
  type DocumentReportColumn,
  type DocumentReportStatus,
  type StudentDocumentReportRow,
} from '@/lib/student-document-report';

export interface StudentDocumentReportPrintOptions {
  schoolName: string;
  academicYear?: string;
  classLabel?: string;
  sectionLabel?: string;
  rows: StudentDocumentReportRow[];
}

const DOCUMENT_COLUMNS: DocumentReportColumn[] = [
  'tc',
  'bc',
  'student_aadhar',
  'parents_aadhar',
  'student_photo',
  'father_photo',
  'mother_photo',
];

const PRINT_COLUMN_WIDTHS = [
  '3%',
  '10%',
  '6%',
  '7%',
  '14%',
  '12%',
  '7%',
  '5.85%',
  '5.85%',
  '5.85%',
  '5.85%',
  '5.85%',
  '5.85%',
  '5.85%',
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textCellStyle(extra = ''): string {
  return `border:1px solid #111;padding:3px 4px;font-size:7pt;vertical-align:middle;overflow:hidden;word-break:break-word;${extra}`;
}

function statusCellAttributes(status: DocumentReportStatus): string {
  const { backgroundColor, color } = getDocumentStatusStyle(status);
  return `class="${documentStatusCssClass(status)}" style="${textCellStyle(
    `text-align:center;font-size:6.5pt;line-height:1.15;font-weight:600;white-space:normal;background-color:${backgroundColor};color:${color};`,
  )}"`;
}

export function buildStudentDocumentReportPrintHtml(
  options: StudentDocumentReportPrintOptions,
): string {
  const yearLabel = options.academicYear?.trim() || new Date().getFullYear().toString();
  const title = `Pending Documents of Students (${yearLabel})`;

  const colgroup = PRINT_COLUMN_WIDTHS.map(
    (width) => `<col style="width:${width};" />`,
  ).join('');

  const headerCells = DOCUMENT_COLUMNS.map(
    (column) =>
      `<th style="${textCellStyle(
        'text-align:center;font-size:6.5pt;line-height:1.1;font-weight:700;background:#f3f4f6;white-space:normal;',
      )}">${escapeHtml(DOCUMENT_REPORT_COLUMN_LABELS[column])}</th>`,
  ).join('');

  const bodyRows = options.rows
    .map((row, index) => {
      const docCells = DOCUMENT_COLUMNS.map(
        (column) =>
          `<td ${statusCellAttributes(row[column])}>${escapeHtml(documentStatusLabel(row[column]))}</td>`,
      ).join('');

      return `<tr>
        <td style="${textCellStyle('text-align:center;background:transparent;color:#111;')}">${index + 1}</td>
        <td style="${textCellStyle('font-size:6.5pt;background:transparent;color:#111;')}">${escapeHtml(row.admission_number)}</td>
        <td style="${textCellStyle('text-align:center;font-size:6.5pt;background:transparent;color:#111;')}">${escapeHtml(row.class_name)}</td>
        <td style="${textCellStyle('text-align:center;font-size:6.5pt;background:transparent;color:#111;')}">${escapeHtml(row.section_name)}</td>
        <td style="${textCellStyle('font-size:7pt;background:transparent;color:#111;')}">${escapeHtml(row.student_name.toUpperCase())}</td>
        <td style="${textCellStyle('font-size:7pt;background:transparent;color:#111;')}">${escapeHtml(row.father_name.toUpperCase())}</td>
        <td style="${textCellStyle('text-align:center;font-size:6.5pt;background:transparent;color:#111;')}">${escapeHtml(row.first_adm_class)}</td>
        ${docCells}
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #111;
        font-family: Arial, Helvetica, sans-serif;
      }
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      ${DOCUMENT_REPORT_PRINT_STATUS_CSS}
      .report-shell {
        border: 2px solid #111;
      }
      .report-header {
        text-align: center;
        border-bottom: 2px solid #111;
        padding: 10px 8px;
      }
      .report-header h1 {
        margin: 0 0 4px;
        font-size: 14pt;
        font-weight: 700;
        line-height: 1.2;
      }
      .report-header h2 {
        margin: 0;
        font-size: 11pt;
        font-weight: 700;
        line-height: 1.2;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
      th, td {
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="report-shell">
      <div class="report-header">
        <h1>${escapeHtml(options.schoolName)}</h1>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <table>
        <colgroup>${colgroup}</colgroup>
        <thead>
          <tr>
            <th style="${textCellStyle('text-align:center;font-weight:700;background:#f3f4f6;')}">Sr No.</th>
            <th style="${textCellStyle('font-weight:700;background:#f3f4f6;')}">Adm. No.</th>
            <th style="${textCellStyle('text-align:center;font-weight:700;background:#f3f4f6;')}">Class</th>
            <th style="${textCellStyle('text-align:center;font-weight:700;background:#f3f4f6;')}">Section</th>
            <th style="${textCellStyle('font-weight:700;background:#f3f4f6;')}">Student Name</th>
            <th style="${textCellStyle('font-weight:700;background:#f3f4f6;')}">Father Name</th>
            <th style="${textCellStyle('text-align:center;font-weight:700;background:#f3f4f6;')}">First Adm. Class</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  </body>
</html>`;
}

export function printStudentDocumentReport(options: StudentDocumentReportPrintOptions) {
  if (options.rows.length === 0) return;

  const html = buildStudentDocumentReportPrintHtml(options);
  printViaHiddenIframe(html);
}

function printViaHiddenIframe(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'Student document report print';
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';

  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;

    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }

    win.focus();
    win.print();
    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
  };

  iframe.onload = () => {
    window.setTimeout(triggerPrint, 150);
  };

  // Fallback if onload already fired or does not fire after document.write
  window.setTimeout(triggerPrint, 500);
}
