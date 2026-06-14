import { BULK_EDIT_COLUMNS, BulkEditRow } from '@/features/students/utils/bulk-edit';

/** Browsers cannot reliably render very large tables in print preview. */
export const MAX_BROWSER_PRINT_ROWS = 500;

const EXPORT_COLUMNS = BULK_EDIT_COLUMNS.filter(
  (col) => col.key !== 'row_number'
) as Array<{ key: keyof BulkEditRow; label: string }>;

export const BULK_EDIT_EXPORT_COLUMNS = EXPORT_COLUMNS;

const PRINT_COLUMN_KEYS: Array<keyof BulkEditRow> = [
  'admission_number',
  'student_code',
  'first_name',
  'middle_name',
  'last_name',
  'date_of_birth',
  'gender',
  'class_name',
  'section_name',
  'roll_number',
  'parent_name',
  'parent_phone',
  'status',
];

export const BULK_EDIT_PRINT_COLUMNS = PRINT_COLUMN_KEYS.map((key) => {
  const column = BULK_EDIT_COLUMNS.find((col) => col.key === key);
  return { key, label: column?.label ?? key };
});

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

export function bulkEditRowsToCsv(rows: BulkEditRow[]): string {
  const header = EXPORT_COLUMNS.map((col) => escapeCsvValue(col.label)).join(',');
  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => escapeCsvValue(row[col.key])).join(',')
  );
  return [header, ...body].join('\n');
}

export function downloadBulkEditCsv(rows: BulkEditRow[], filenamePrefix = 'students_bulk_edit') {
  const csv = bulkEditRowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export interface BulkEditPrintMeta {
  title?: string;
  filterSummary?: string;
  totalCount: number;
  printedCount: number;
  rangeStart?: number;
  rangeEnd?: number;
  batchNumber?: number;
  totalBatches?: number;
}

export interface PrintBatchRange {
  start: number;
  end: number;
  count: number;
  batchIndex: number;
}

export function getPrintBatchRanges(
  totalCount: number,
  batchSize = MAX_BROWSER_PRINT_ROWS
): PrintBatchRange[] {
  if (totalCount <= 0) return [];

  const batches: PrintBatchRange[] = [];
  for (let start = 1; start <= totalCount; start += batchSize) {
    const end = Math.min(start + batchSize - 1, totalCount);
    batches.push({
      start,
      end,
      count: end - start + 1,
      batchIndex: batches.length + 1,
    });
  }
  return batches;
}

function buildBulkEditPrintHtml(rows: BulkEditRow[], meta: BulkEditPrintMeta): string {
  const title = meta.title ?? 'Students List';
  const printedAt = new Date().toLocaleString();
  const hasRange = meta.rangeStart != null && meta.rangeEnd != null;
  const rangeLabel = hasRange
    ? `Records ${meta.rangeStart!.toLocaleString()}–${meta.rangeEnd!.toLocaleString()} of ${meta.totalCount.toLocaleString()}`
    : `Students shown: ${meta.printedCount}${meta.printedCount < meta.totalCount ? ` of ${meta.totalCount}` : ''}`;
  const batchLabel =
    meta.batchNumber != null && meta.totalBatches != null
      ? `Batch ${meta.batchNumber} of ${meta.totalBatches}`
      : '';

  const headerCells = `<th class="index-col">#</th>${BULK_EDIT_PRINT_COLUMNS.map(
    (col) => `<th>${escapeHtml(col.label)}</th>`
  ).join('')}`;

  const indexStart = meta.rangeStart ?? 1;
  const bodyRows: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const indexCell = `<td class="index-col">${indexStart + i}</td>`;
    const cells = BULK_EDIT_PRINT_COLUMNS.map((col) => `<td>${escapeHtml(row[col.key])}</td>`).join(
      ''
    );
    bodyRows.push(`<tr>${indexCell}${cells}</tr>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #111; margin: 0; padding: 16px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { font-size: 10px; color: #555; margin-bottom: 12px; line-height: 1.4; }
    .warning { color: #b45309; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
    th.index-col, td.index-col { text-align: center; width: 36px; white-space: nowrap; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <div>Printed: ${escapeHtml(printedAt)}</div>
    <div>${escapeHtml(rangeLabel)}</div>
    ${batchLabel ? `<div>${escapeHtml(batchLabel)}</div>` : ''}
    ${meta.filterSummary ? `<div>Filters: ${escapeHtml(meta.filterSummary)}</div>` : ''}
    ${
      hasRange && meta.totalBatches != null && meta.totalBatches > 1
        ? `<div class="warning">Print each batch separately to cover all ${meta.totalCount.toLocaleString()} students, or use Download CSV for the full list.</div>`
        : ''
    }
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows.join('')}</tbody>
  </table>
</body>
</html>`;
}

export function printBulkEditRowsViaIframe(rows: BulkEditRow[], meta: BulkEditPrintMeta) {
  const html = buildBulkEditPrintHtml(rows, meta);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onload = () => {
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      cleanup();
      return;
    }

    printWindow.focus();
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60000);
    printWindow.print();
  };

  iframe.src = url;
}
