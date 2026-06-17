import {
  RECEIPT_PRINT_DOCUMENT_STYLES,
  RECEIPT_PREVIEW_STYLES,
} from '@edulakhya/utils'

export interface InventoryInvoiceLine {
  item_name?: string
  item_code?: string
  quantity?: number | string
  unit_price?: number | string
  gst_percentage?: number | string
  gst_amount?: number | string
  total_amount?: number | string
}

export interface InventoryInvoiceData {
  invoice_number?: string
  created_at?: string
  payment_status?: string
  subtotal?: number | string
  gst_amount?: number | string
  discount_amount?: number | string
  total_amount?: number | string
  remarks?: string
}

export interface InventoryInvoiceStudent {
  first_name?: string
  last_name?: string
  admission_number?: string
  class_name?: string
  section_name?: string
  parent_name?: string
  parent_phone?: string
  mother_name?: string
  address?: string
  city?: string
  state?: string
}

export interface InventoryInvoiceSchoolSettings {
  school_name?: string
  school_address?: string
  school_phone?: string
  school_email?: string
  logo_url?: string
  academic_year?: string
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatAcademicYearShort(year: string) {
  if (!year) return ''
  const parts = year.split('-')
  if (parts.length < 2) return year
  const end = parts[1].length <= 2 ? parts[1] : parts[1].slice(-2)
  return `${parts[0]}-${end}`
}

function formatAmount(amount: number, decimals = 2) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatReceiptDate(date: unknown) {
  if (!date) return '—'
  const d = new Date(date as string)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function formatClassSection(student: InventoryInvoiceStudent) {
  const cls = student.class_name?.trim()
  const sec = student.section_name?.trim()
  if (cls && sec) return `${cls}-${sec}`
  return cls || sec || '—'
}

function formatStudentAddress(student: InventoryInvoiceStudent) {
  return [student.address, student.city, student.state].filter(Boolean).join(', ') || '—'
}

function resolveLogoUrl(logoUrl?: string) {
  if (!logoUrl) return ''
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`
  }
  return logoUrl
}

function numberToWords(num: number): string {
  if (!Number.isFinite(num) || num < 0) return ''
  if (num === 0) return 'Zero'

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function twoDigits(n: number): string {
    if (n < 20) return ones[n]
    return `${tens[Math.floor(n / 10)]}${ones[n % 10] ? ` ${ones[n % 10]}` : ''}`.trim()
  }

  function threeDigits(n: number): string {
    if (n < 100) return twoDigits(n)
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ''}`
  }

  let n = Math.round(num)
  const parts: string[] = []

  const crore = Math.floor(n / 10000000)
  if (crore) {
    parts.push(`${threeDigits(crore)} Crore`)
    n %= 10000000
  }

  const lakh = Math.floor(n / 100000)
  if (lakh) {
    parts.push(`${threeDigits(lakh)} Lakh`)
    n %= 100000
  }

  const thousand = Math.floor(n / 1000)
  if (thousand) {
    parts.push(`${threeDigits(thousand)} Thousand`)
    n %= 1000
  }

  if (n) {
    parts.push(threeDigits(n))
  }

  return parts.join(' ')
}

const INVENTORY_INVOICE_PRINT_STYLES = RECEIPT_PRINT_DOCUMENT_STYLES

export const INVENTORY_INVOICE_PREVIEW_STYLES = RECEIPT_PREVIEW_STYLES

export function buildInventoryInvoiceInnerHtml(
  invoice: InventoryInvoiceData,
  items: InventoryInvoiceLine[],
  student: InventoryInvoiceStudent,
  settings: InventoryInvoiceSchoolSettings = {},
): string {
  const academicYear = settings.academic_year || ''
  const schoolName = settings.school_name || 'School Name'
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim().toUpperCase()
  const fatherName = (student.parent_name || '—').toUpperCase()
  const motherName = (student.mother_name || '—').toUpperCase()
  const logoUrl = resolveLogoUrl(settings.logo_url)
  const subtotal = Number(invoice.subtotal || 0)
  const gstAmount = Number(invoice.gst_amount || 0)
  const discountAmount = Number(invoice.discount_amount || 0)
  const totalAmount = Number(invoice.total_amount || 0)
  const paymentStatus = (invoice.payment_status || 'paid').toUpperCase()

  const itemRows = items
    .map((line, index) => {
      const description = [line.item_name, line.item_code ? `(${line.item_code})` : '']
        .filter(Boolean)
        .join(' ')
      return `
      <tr>
        <td class="fr-center">${index + 1}</td>
        <td>${escapeHtml(description.toUpperCase())}</td>
        <td class="fr-center">${escapeHtml(line.quantity ?? '')}</td>
        <td class="fr-num">${formatAmount(Number(line.unit_price || 0))}</td>
        <td class="fr-center">${escapeHtml(line.gst_percentage ?? 0)}%</td>
        <td class="fr-num">${formatAmount(Number(line.total_amount || 0))}</td>
      </tr>`
    })
    .join('')

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="School logo" class="fr-logo" />`
    : `<div class="fr-logo-placeholder">School<br/>Logo</div>`

  const contactParts = [
    settings.school_phone ? `Contact No : ${settings.school_phone}` : '',
    settings.school_email ? `Email : ${settings.school_email}` : '',
  ].filter(Boolean)

  return `
    <div class="fr-sheet">
      <div class="fr-header">
        ${logoHtml}
        <div>
          <div class="fr-school-name">${escapeHtml(schoolName)}</div>
          ${settings.school_address ? `<div class="fr-school-meta">${escapeHtml(settings.school_address)}</div>` : ''}
          ${contactParts.length ? `<div class="fr-school-meta">${escapeHtml(contactParts.join('   '))}</div>` : ''}
        </div>
      </div>

      <div class="fr-receipt-title">SALES INVOICE (${escapeHtml(formatAcademicYearShort(academicYear) || '—')})</div>

      <div class="fr-info-grid">
        <div class="fr-info-col">
          <div class="fr-info-row"><div class="fr-info-label">Invoice No. :</div><div class="fr-info-value">${escapeHtml(invoice.invoice_number || '—')}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Name of the Student :</div><div class="fr-info-value">${escapeHtml(studentName)}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Admission No :</div><div class="fr-info-value">${escapeHtml(student.admission_number || '—')}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Father's Name :</div><div class="fr-info-value">${escapeHtml(fatherName)}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Address :</div><div class="fr-info-value">${escapeHtml(formatStudentAddress(student).toUpperCase())}</div></div>
        </div>
        <div class="fr-info-col">
          <div class="fr-info-row"><div class="fr-info-label">Date :</div><div class="fr-info-value">${escapeHtml(formatReceiptDate(invoice.created_at))}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Class &amp; Section :</div><div class="fr-info-value">${escapeHtml(formatClassSection(student).toUpperCase())}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Mobile No. :</div><div class="fr-info-value">${escapeHtml(student.parent_phone || '—')}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Mother's Name :</div><div class="fr-info-value">${escapeHtml(motherName)}</div></div>
        </div>
      </div>

      <table class="fr-table">
        <thead>
          <tr>
            <th style="width:7%">S.No.</th>
            <th style="width:35%">Item Description</th>
            <th style="width:10%">Qty</th>
            <th style="width:14%">Unit Price</th>
            <th style="width:10%">GST</th>
            <th style="width:24%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr>
            <td colspan="5" class="fr-center" style="font-weight:700;">SUBTOTAL</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="5" class="fr-center" style="font-weight:700;">GST</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(gstAmount)}</td>
          </tr>
          ${
            discountAmount > 0
              ? `<tr>
            <td colspan="5" class="fr-center" style="font-weight:700;">DISCOUNT</td>
            <td class="fr-num" style="font-weight:700;">-${formatAmount(discountAmount)}</td>
          </tr>`
              : ''
          }
          <tr>
            <td colspan="5" class="fr-center" style="font-weight:700;">TOTAL</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="fr-section-title">Payment Information</div>
      <table class="fr-table">
        <thead>
          <tr>
            <th style="width:8%">Sr. No</th>
            <th style="width:30%">Payment Status</th>
            <th style="width:22%">Invoice Date</th>
            <th style="width:40%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="fr-center">1</td>
            <td>${escapeHtml(paymentStatus)}</td>
            <td class="fr-center">${escapeHtml(formatReceiptDate(invoice.created_at))}</td>
            <td class="fr-num">${formatAmount(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="fr-remarks-row">
        <div>Remarks :</div>
        <div>${escapeHtml(invoice.remarks || '')}</div>
      </div>

      <div class="fr-total-words">
        <span>Total in words : ${escapeHtml(numberToWords(Math.round(totalAmount)))} Only</span>
        <span>Total: ${formatAmount(totalAmount)}</span>
      </div>

      <div class="fr-footer-grid">
        <div class="fr-footer-left fr-note">
          <strong>NOTE :</strong> This is a computer-generated sales invoice for school inventory items (books, uniforms, accessories). Please retain this invoice for your records.
        </div>
        <div class="fr-footer-right">
          <div style="font-weight:700;">AUTHORIZED SIGNATORY</div>
          <div class="fr-signature-line">Signature</div>
        </div>
      </div>
    </div>
  `
}

export function buildInventoryInvoiceHtml(
  invoice: InventoryInvoiceData,
  items: InventoryInvoiceLine[],
  student: InventoryInvoiceStudent,
  settings: InventoryInvoiceSchoolSettings = {},
): string {
  return `<div id="invoice-content">${buildInventoryInvoiceInnerHtml(invoice, items, student, settings)}</div>`
}

export function buildInventoryInvoicePrintDocument(
  invoice: InventoryInvoiceData,
  items: InventoryInvoiceLine[],
  student: InventoryInvoiceStudent,
  settings: InventoryInvoiceSchoolSettings = {},
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sales Invoice ${escapeHtml(invoice.invoice_number || '')}</title>
  <style>${INVENTORY_INVOICE_PRINT_STYLES}</style>
</head>
<body>
  ${buildInventoryInvoiceHtml(invoice, items, student, settings)}
</body>
</html>`
}

export function printInventoryInvoiceViaIframe(
  invoice: InventoryInvoiceData,
  items: InventoryInvoiceLine[],
  student: InventoryInvoiceStudent,
  settings: InventoryInvoiceSchoolSettings = {},
) {
  const html = buildInventoryInvoicePrintDocument(invoice, items, student, settings)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const printAndCleanup = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }

  if (iframe.contentWindow?.document.readyState === 'complete') {
    printAndCleanup()
  } else {
    iframe.onload = printAndCleanup
  }
}
