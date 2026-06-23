import {
  getHolidayDayNumbers,
  getMonthDateRange,
  getMonthLabel,
  getSundayDayNumbers,
  REGISTER_LEGEND,
  type RegisterRow,
} from '@/features/attendance/utils/attendance-status'

export interface RegisterExportOptions {
  rows: RegisterRow[]
  month: number
  year: number
  entityLabel: string
  classLabel?: string
  holidayDates?: Set<string>
  schoolName?: string
  filePrefix?: string
}

const NON_WORKING_BG = '#9ca3af'
const NON_WORKING_HEADER_BG = '#6b7280'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsvValue(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildExportMeta(options: RegisterExportOptions) {
  const monthLabel = `${getMonthLabel(options.month)} ${options.year}`
  return {
    monthLabel,
    filename: `${options.filePrefix ?? 'attendance'}-register-${options.year}-${String(options.month).padStart(2, '0')}.csv`,
    legend: REGISTER_LEGEND.map((item) => `${item.code} = ${item.label}`).join(', '),
  }
}

export function downloadRegisterExcel(options: RegisterExportOptions) {
  if (options.rows.length === 0) return

  const { daysInMonth } = getMonthDateRange(options.month, options.year)
  const { monthLabel, filename, legend } = buildExportMeta(options)
  const dayHeaders = Array.from({ length: daysInMonth }, (_, index) =>
    String(index + 1).padStart(2, '0'),
  )
  const headerRow = [options.entityLabel, ...dayHeaders].join(',')
  const dataRows = options.rows.map((row) =>
    [escapeCsvValue(row.name), ...row.days].join(','),
  )

  const metaRows = [
    options.schoolName || 'School',
    'Monthly Attendance Register',
    ...(options.classLabel ? [`Class,${escapeCsvValue(options.classLabel)}`] : []),
    `Month,${escapeCsvValue(monthLabel)}`,
    legend,
    '',
  ]

  const csv = [...metaRows, headerRow, ...dataRows].join('\n')
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildRegisterPrintHtml(options: RegisterExportOptions) {
  const { daysInMonth } = getMonthDateRange(options.month, options.year)
  const sundays = getSundayDayNumbers(options.month, options.year, daysInMonth)
  const holidays = getHolidayDayNumbers(options.month, options.year, options.holidayDates ?? new Set())
  const { monthLabel, legend } = buildExportMeta(options)

  const isNonWorking = (day: number) => sundays.has(day) || holidays.has(day)

  const dayCellStyle = (day: number) => {
    const bg = isNonWorking(day) ? `background:${NON_WORKING_BG};` : ''
    return `border:1px solid #ccc;padding:2px;font-size:7pt;text-align:center;font-weight:600;${bg}`
  }

  const dayHeaders = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const headerBg = isNonWorking(day) ? `background:${NON_WORKING_HEADER_BG};color:#fff;` : 'background:#f3f4f6;'
    return `<th style="border:1px solid #ccc;padding:2px;font-size:7pt;text-align:center;${headerBg}">${String(day).padStart(2, '0')}</th>`
  }).join('')

  const bodyRows = options.rows
    .map((row) => {
      const dayCells = row.days
        .map((code, index) => {
          const day = index + 1
          return `<td style="${dayCellStyle(day)}">${escapeHtml(code)}</td>`
        })
        .join('')
      return `<tr>
        <td style="border:1px solid #ccc;padding:3px 6px;font-size:8pt;white-space:nowrap;">${escapeHtml(row.name)}</td>
        ${dayCells}
      </tr>`
    })
    .join('')

  const classRow = options.classLabel
    ? `<span>Class: ${escapeHtml(options.classLabel)}</span>`
    : '<span></span>'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Monthly Attendance Register</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 12px; }
      @page { size: A4 landscape; margin: 10mm; }
    </style>
  </head>
  <body>
    <div style="font-size:14pt;font-weight:700;margin-bottom:4px;">${escapeHtml(options.schoolName || 'School')}</div>
    <div style="font-size:11pt;font-weight:600;margin-bottom:8px;">Monthly Attendance Register</div>
    <div style="display:flex;justify-content:space-between;font-size:9pt;font-weight:600;margin-bottom:8px;">
      ${classRow}
      <span>Month: ${escapeHtml(monthLabel)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:4px 6px;font-size:8pt;text-align:left;background:#f3f4f6;width:140px;">${escapeHtml(options.entityLabel)}</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <p style="font-size:7pt;color:#6b7280;margin-top:8px;">${escapeHtml(legend)}</p>
  </body>
</html>`
}

export function printRegister(options: RegisterExportOptions) {
  if (options.rows.length === 0) return

  const html = buildRegisterPrintHtml(options)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 500)
  }
}
