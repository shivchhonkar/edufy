import type { TimetableEntry, TimetablePeriod, WorkingDay } from '@/features/timetable/types';
import { formatTime, getWorkingDays, isPeriodAllowedOnDay } from '@/features/timetable/utils';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_STYLES = `
  @media print {
    @page { margin: 10mm; size: landscape; }
    body { margin: 0; }
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    padding: 12px;
  }
  .header {
    text-align: center;
    margin-bottom: 16px;
    border-bottom: 2px solid #333;
    padding-bottom: 8px;
  }
  .header h1 { margin: 0 0 4px; font-size: 20px; }
  .header p { margin: 2px 0; font-size: 12px; color: #555; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  th, td {
    border: 1px solid #999;
    padding: 6px 4px;
    text-align: center;
    vertical-align: top;
  }
  th {
    background: #e5e7eb;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
  }
  .period-col {
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
    background: #f9fafb;
  }
  .period-time {
    font-weight: 400;
    font-size: 9px;
    color: #666;
  }
  .break-row td {
    background: #fef3c7;
    color: #92400e;
    font-style: italic;
  }
  .cell-subject { font-weight: 600; }
  .cell-meta { font-size: 9px; color: #555; margin-top: 2px; }
  .cell-free { color: #9ca3af; }
  .cell-na { color: #d1d5db; }
  .status-available { background: #dcfce7; color: #166534; font-weight: 600; }
  .status-busy { background: #fee2e2; color: #991b1b; font-weight: 600; }
  .footer {
    margin-top: 12px;
    text-align: center;
    font-size: 10px;
    color: #888;
  }
`;

function openPrintDocument(title: string, bodyHtml: string): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const generatedOn = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${bodyHtml}
    <div class="footer">Generated on ${escapeHtml(generatedOn)}</div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`);
  printWindow.document.close();
  return true;
}

function buildHeader(title: string, subtitle?: string) {
  return `<div class="header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </div>`;
}

function getEntryForCell(
  entries: TimetableEntry[],
  dayOfWeek: number,
  periodId: number,
): TimetableEntry | undefined {
  return entries.find((e) => e.day_of_week === dayOfWeek && e.period_id === periodId);
}

export interface ClassTimetablePrintOptions {
  title: string;
  subtitle?: string;
  periods: TimetablePeriod[];
  workingDays: WorkingDay[];
  entries: TimetableEntry[];
}

export function printClassTimetable(options: ClassTimetablePrintOptions): boolean {
  const { title, subtitle, periods, workingDays, entries } = options;
  const activeDays = getWorkingDays(workingDays);
  const sortedPeriods = [...periods].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  let tableRows = '';
  for (const period of sortedPeriods) {
    const isBreak =
      period.is_schedulable === false ||
      period.slot_type === 'break' ||
      period.slot_type === 'lunch';

    if (isBreak) {
      const timeLabel = `${formatTime(period.start_time)}${
        period.end_time ? ` – ${formatTime(period.end_time)}` : ''
      }`;
      tableRows += `<tr class="break-row">
        <td class="period-col">${escapeHtml(period.name)}</td>
        <td colspan="${activeDays.length}">${escapeHtml(timeLabel)} · Break</td>
      </tr>`;
      continue;
    }

    let cells = '';
    for (const day of activeDays) {
      const allowed = isPeriodAllowedOnDay(period.id, day.day_of_week, periods, workingDays);
      if (!allowed) {
        cells += '<td class="cell-na">—</td>';
        continue;
      }
      const entry = getEntryForCell(entries, day.day_of_week, period.id);
      if (!entry?.subject_name) {
        cells += '<td class="cell-free">Free</td>';
        continue;
      }
      cells += `<td>
        <div class="cell-subject">${escapeHtml(entry.subject_name)}</div>
        ${entry.teacher_name ? `<div class="cell-meta">${escapeHtml(entry.teacher_name)}</div>` : ''}
        ${entry.room ? `<div class="cell-meta">${escapeHtml(entry.room)}</div>` : ''}
      </td>`;
    }

    const timeLabel = formatTime(period.start_time);
    tableRows += `<tr>
      <td class="period-col">
        ${escapeHtml(period.name)}
        ${timeLabel ? `<div class="period-time">${escapeHtml(timeLabel)}</div>` : ''}
      </td>
      ${cells}
    </tr>`;
  }

  const dayHeaders = activeDays.map((d) => `<th>${escapeHtml(d.day_name.slice(0, 3))}</th>`).join('');

  const bodyHtml = `${buildHeader(title, subtitle)}
    <table>
      <thead>
        <tr>
          <th class="period-col">Period</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  return openPrintDocument(title, bodyHtml);
}

export interface TeacherTimetablePrintOptions {
  teacherName: string;
  periods: TimetablePeriod[];
  workingDays: WorkingDay[];
  entries: TimetableEntry[];
}

export function printTeacherTimetable(options: TeacherTimetablePrintOptions): boolean {
  const { teacherName, periods, workingDays, entries } = options;
  const activeDays = getWorkingDays(workingDays);
  const schedulablePeriods = [...periods]
    .filter((p) => p.is_schedulable !== false && p.slot_type !== 'break' && p.slot_type !== 'lunch')
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  let tableRows = '';
  for (const period of schedulablePeriods) {
    let cells = '';
    for (const day of activeDays) {
      const allowed = isPeriodAllowedOnDay(period.id, day.day_of_week, periods, workingDays);
      if (!allowed) {
        cells += '<td class="cell-na">—</td>';
        continue;
      }
      const entry = getEntryForCell(entries, day.day_of_week, period.id);
      if (!entry?.class_name) {
        cells += '<td class="cell-free">Free</td>';
        continue;
      }
      const assignment = `${entry.class_name}${entry.section_name ? ` ${entry.section_name}` : ''}`;
      cells += `<td>
        <div class="cell-subject">${escapeHtml(assignment)}</div>
        ${entry.subject_name ? `<div class="cell-meta">${escapeHtml(entry.subject_name)}</div>` : ''}
      </td>`;
    }

    const timeLabel = formatTime(period.start_time);
    tableRows += `<tr>
      <td class="period-col">
        ${escapeHtml(period.name)}
        ${timeLabel ? `<div class="period-time">${escapeHtml(timeLabel)}</div>` : ''}
      </td>
      ${cells}
    </tr>`;
  }

  const dayHeaders = activeDays.map((d) => `<th>${escapeHtml(d.day_name.slice(0, 3))}</th>`).join('');
  const title = `Teacher Timetable — ${teacherName}`;

  const bodyHtml = `${buildHeader(title, 'Weekly teaching schedule')}
    <table>
      <thead>
        <tr>
          <th class="period-col">Period</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  return openPrintDocument(title, bodyHtml);
}

export interface TeacherAvailabilityPrintOptions {
  teacherName: string;
  periods: TimetablePeriod[];
  workingDays: WorkingDay[];
  isAvailable: (dayOfWeek: number, periodId: number) => boolean;
}

export function printTeacherAvailability(options: TeacherAvailabilityPrintOptions): boolean {
  const { teacherName, periods, workingDays, isAvailable } = options;
  const activeDays = getWorkingDays(workingDays);
  const schedulablePeriods = periods
    .filter((p) => p.is_schedulable !== false && (p.slot_type === 'period' || !p.slot_type))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  let tableRows = '';
  for (const period of schedulablePeriods) {
    let cells = '';
    for (const day of activeDays) {
      const allowed = isPeriodAllowedOnDay(period.id, day.day_of_week, periods, workingDays);
      if (!allowed) {
        cells += '<td class="cell-na">—</td>';
        continue;
      }
      const available = isAvailable(day.day_of_week, period.id);
      cells += `<td class="${available ? 'status-available' : 'status-busy'}">${
        available ? 'Available' : 'Busy'
      }</td>`;
    }
    tableRows += `<tr>
      <td class="period-col">${escapeHtml(period.name)}</td>
      ${cells}
    </tr>`;
  }

  const dayHeaders = activeDays.map((d) => `<th>${escapeHtml(d.day_name.slice(0, 3))}</th>`).join('');
  const title = `Teacher Availability — ${teacherName}`;

  const bodyHtml = `${buildHeader(title, 'Weekly availability by period')}
    <table>
      <thead>
        <tr>
          <th class="period-col">Period</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  return openPrintDocument(title, bodyHtml);
}
