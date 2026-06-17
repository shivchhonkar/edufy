import {
  RECEIPT_PRINT_DOCUMENT_STYLES,
  RECEIPT_PREVIEW_STYLES,
} from '@edulakhya/utils';

export interface FeeReceiptLineItem {
  label: string;
  due: number;
  paid: number;
  balance: number;
}

export interface FeeReceiptPayment {
  receipt_number?: string;
  payment_date?: string;
  payment_method?: string;
  transaction_id?: string;
  amount_paid?: number | string;
  discount_applied?: number | string;
  late_fee_charged?: number | string;
  fee_type?: string;
  month?: number | string;
  academic_year?: string;
  remarks?: string;
  fee_breakdown?: Array<{
    fee_type?: string;
    month?: number | string;
    year?: number;
    amount?: number | string;
    late_fee?: number | string;
  }>;
  is_tuition_only?: boolean;
  id?: number | string;
  received_by_name?: string;
  created_by_name?: string;
}

export interface FeeReceiptStudent {
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  parent_name?: string;
  parent_phone?: string;
  mother_name?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface FeeReceiptSettings {
  school_name?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_website?: string;
  logo_url?: string;
  academic_year?: string;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFeeTypeDisplay(feeType: string) {
  const map: Record<string, string> = {
    'Tuition Fee': 'TUITION FEE',
    'Transport Fee': 'TRANSPORT FEE',
    'Library Fee': 'LIBRARY FEE',
    'Laboratory Fee': 'LABORATORY FEE',
    'Sports Fee': 'SPORTS FEE',
    'Examination Fee': 'EXAMINATION FEE',
    'Activity Fee': 'ACTIVITY FEE',
    'Late Fee': 'LATE FEE',
    'Other Charges': 'OTHER CHARGES',
    'Fee Payment': 'FEE PAYMENT',
  };
  return (map[feeType] || feeType || 'FEE PAYMENT').toUpperCase();
}

function parseMonthNumber(month: string | number, year?: number): number {
  if (typeof month === 'number') return month;
  const parsed = parseInt(month, 10);
  if (!Number.isNaN(parsed)) return parsed;
  const d = new Date(`${month} 1, ${year || new Date().getFullYear()}`);
  return d.getMonth() + 1;
}

function parseYearNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value ?? '').trim();
  if (!str) return null;

  // Supports: "2026-27", "2026-2027", "2026"
  const parts = str.split('-').map((p) => p.trim());
  const start = parseInt(parts[0] || '', 10);
  if (!Number.isFinite(start)) return null;
  return start;
}

function monthShort(month: number) {
  // Use a fixed safe year to avoid Invalid Date
  return new Date(2024, month - 1).toLocaleString('en-IN', { month: 'short' });
}

function isFullAcademicYear(months: { m: number }[]) {
  if (months.length < 12) return false;
  const set = new Set(months.map((x) => x.m));
  // Apr..Dec + Jan..Mar => all 12 calendar months
  return set.size === 12;
}

function formatMonthSuffix(months: { m: number; y?: number }[], academicYear?: string) {
  const session = academicYear ? formatAcademicYearShort(academicYear) : '';

  if (!months.length) {
    return session ? ` (ANNUAL ${session})` : ' (ANNUAL)';
  }

  const sorted = [...months].sort((a, b) => (a.y || 0) - (b.y || 0) || a.m - b.m);
  const duration = isFullAcademicYear(months) ? 'ANNUAL' : 'MONTHLY';

  if (sorted.length === 1) {
    return ` (${duration} ${monthShort(sorted[0].m).toUpperCase()} ${session || ''})`.trim();
  }

  const monthList = sorted
    .map((entry) => monthShort(entry.m).toUpperCase())
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(', ');

  return ` (${duration} ${monthList}${session ? `, ${session}` : ''})`.trim();
}

function getFeeTypePriority(label: string): number {
  const key = label.toLowerCase();
  if (key.includes('tuition')) return 1;
  if (key.includes('transport')) return 2;
  if (key.includes('examination') || key.includes('activity')) return 3;
  if (key.includes('late')) return 99;
  return 50;
}

export function buildFeeReceiptLineItems(
  payment: FeeReceiptPayment,
  academicYear?: string,
): FeeReceiptLineItem[] {
  const yearLabel = academicYear || payment.academic_year;

  if (payment.fee_breakdown?.length) {
    const groups = new Map<string, { due: number; months: { m: number; y: number }[] }>();

    for (const fee of payment.fee_breakdown) {
      const type = getFeeTypeDisplay(fee.fee_type || 'Fee Payment');
      const amount = parseFloat(String(fee.amount)) || 0;
      const late = parseFloat(String(fee.late_fee)) || 0;
      const entry = groups.get(type) || { due: 0, months: [] };
      entry.due += amount + late;
      if (fee.month) {
        const y = parseYearNumber(fee.year) ?? parseYearNumber(yearLabel) ?? new Date().getFullYear();
        entry.months.push({
          m: parseMonthNumber(fee.month, y),
          y,
        });
      }
      groups.set(type, entry);
    }

    const lineItems = Array.from(groups.entries()).map(([type, data]) => ({
      label: `${type}${formatMonthSuffix(data.months, yearLabel)}`.replace(/\s+/g, ' ').trim(),
      due: data.due,
      paid: data.due,
      balance: 0,
    }));

    lineItems.sort((a, b) => {
      const p = getFeeTypePriority(a.label) - getFeeTypePriority(b.label);
      return p !== 0 ? p : a.label.localeCompare(b.label);
    });

    return lineItems;
  }

  const lateFee = parseFloat(String(payment.late_fee_charged || 0));
  const gross =
    parseFloat(String(payment.amount_paid || 0)) +
    parseFloat(String(payment.discount_applied || 0)) -
    lateFee;

  let label = getFeeTypeDisplay(payment.fee_type || 'Fee Payment');
  if (payment.month) {
    const year = payment.academic_year?.split('-')?.[0] || new Date().getFullYear();
    label += formatMonthSuffix([
      { m: parseMonthNumber(payment.month, Number(year)), y: Number(year) },
    ]);
  } else if (yearLabel) {
    label += ` (ANNUAL (${formatAcademicYearShort(yearLabel)}))`;
  }

  const due = gross > 0 ? gross : parseFloat(String(payment.amount_paid || 0));
  const items: FeeReceiptLineItem[] = [
    { label, due: due + lateFee, paid: due + lateFee, balance: 0 },
  ];

  if (lateFee > 0 && !label.includes('LATE')) {
    items.push({ label: 'LATE FEE', due: lateFee, paid: lateFee, balance: 0 });
  }

  return items;
}

function formatAcademicYearShort(year: string) {
  if (!year) return '';
  const parts = year.split('-');
  if (parts.length < 2) return year;
  const end = parts[1].length <= 2 ? parts[1] : parts[1].slice(-2);
  return `${parts[0]}-${end}`;
}

function formatAmount(amount: number, decimals = 0) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatReceiptDate(date: unknown) {
  if (!date) return '—';
  const d = new Date(date as string);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatReceiptDateTime(date: unknown) {
  if (!date) return '—';
  const d = new Date(date as string);
  return d
    .toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function formatClassSection(student: FeeReceiptStudent) {
  const cls = student.class_name?.trim();
  const sec = student.section_name?.trim();
  if (cls && sec) return `${cls}-${sec}`;
  return cls || sec || '—';
}

function formatStudentAddress(student: FeeReceiptStudent) {
  return [student.address, student.city, student.state].filter(Boolean).join(', ') || '—';
}

function formatPayMode(method?: string) {
  const m = (method || 'cash').toLowerCase();
  if (m === 'cash') return 'Payment in Cash';
  if (m === 'cheque') return 'Payment in Cheque';
  if (m === 'upi' || m === 'online' || m === 'bank') return 'Payment in Bank';
  if (m === 'card') return 'Card Payment';
  return method || 'Payment';
}

function resolveLogoUrl(logoUrl?: string) {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
  }
  return logoUrl;
}

function numberToWords(num: number): string {
  if (!Number.isFinite(num) || num < 0) return '';
  if (num === 0) return 'Zero';

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
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${ones[n % 10] ? ` ${ones[n % 10]}` : ''}`.trim();
  }

  function threeDigits(n: number): string {
    if (n < 100) return twoDigits(n);
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ''}`;
  }

  let n = Math.round(num);
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  if (crore) {
    parts.push(`${threeDigits(crore)} Crore`);
    n %= 10000000;
  }

  const lakh = Math.floor(n / 100000);
  if (lakh) {
    parts.push(`${threeDigits(lakh)} Lakh`);
    n %= 100000;
  }

  const thousand = Math.floor(n / 1000);
  if (thousand) {
    parts.push(`${threeDigits(thousand)} Thousand`);
    n %= 1000;
  }

  if (n) {
    parts.push(threeDigits(n));
  }

  return parts.join(' ');
}

const FEE_RECEIPT_PRINT_STYLES = RECEIPT_PRINT_DOCUMENT_STYLES;

export const FEE_RECEIPT_PREVIEW_STYLES = RECEIPT_PREVIEW_STYLES;

export function buildFeeReceiptInnerHtml(
  payment: FeeReceiptPayment,
  student: FeeReceiptStudent,
  settings: FeeReceiptSettings = {},
  renderOptions: { hideReceiptNo?: boolean } = {},
): string {
  const academicYear = settings.academic_year || payment.academic_year || '';
  const lineItems = buildFeeReceiptLineItems(payment, academicYear);
  const totalPaid = parseFloat(String(payment.amount_paid || 0));
  const totalDue = lineItems.reduce((sum, item) => sum + item.due, 0);
  const totalBalance = lineItems.reduce((sum, item) => sum + item.balance, 0);
  const displayTotal = totalDue > 0 ? totalDue : totalPaid;

  const schoolName = settings.school_name || 'School Name';
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim().toUpperCase();
  const fatherName = (student.parent_name || '—').toUpperCase();
  const motherName = (student.mother_name || '—').toUpperCase();
  const receivedBy = (payment.received_by_name || payment.created_by_name || 'Authorized Signatory').toUpperCase();
  const logoUrl = resolveLogoUrl(settings.logo_url);
  const payMode = formatPayMode(payment.payment_method);
  const isBankPayment = payMode === 'Payment in Bank' || payMode === 'Payment in Cheque';

  const feeRows = lineItems
    .map(
      (item, index) => `
      <tr>
        <td class="fr-center">${index + 1}</td>
        <td>${escapeHtml(item.label)}</td>
        <td class="fr-num">${formatAmount(item.due)}</td>
        <td class="fr-num">${formatAmount(item.paid)}</td>
        <td class="fr-num">${formatAmount(item.balance)}</td>
      </tr>`,
    )
    .join('');

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="School logo" class="fr-logo" />`
    : `<div class="fr-logo-placeholder">School<br/>Logo</div>`;

  const contactParts = [
    settings.school_phone ? `Contact No : ${settings.school_phone}` : '',
    settings.school_email ? `Email : ${settings.school_email}` : '',
  ].filter(Boolean);

  const showReceiptNo = !renderOptions.hideReceiptNo;

  return `
    <div class="fr-sheet">
      <div class="fr-header">
        ${logoHtml}
        <div>
          <div class="fr-school-name">${escapeHtml(schoolName)}</div>
          ${settings.school_address ? `<div class="fr-school-meta">${escapeHtml(settings.school_address)}</div>` : ''}
          ${contactParts.length ? `<div class="fr-school-meta">${escapeHtml(contactParts.join('   '))}</div>` : ''}
          ${settings.school_website ? `<div class="fr-school-meta">Website : ${escapeHtml(settings.school_website)}</div>` : ''}
        </div>
      </div>

      <div class="fr-receipt-title">FEE RECEIPT (${escapeHtml(formatAcademicYearShort(academicYear) || '—')})</div>

      <div class="fr-info-grid">
        <div class="fr-info-col">
          ${
            showReceiptNo
              ? `<div class="fr-info-row"><div class="fr-info-label">Receipt No. :</div><div class="fr-info-value">${escapeHtml(payment.receipt_number || '—')}</div></div>`
              : ''
          }
          <div class="fr-info-row"><div class="fr-info-label">Name of the Student :</div><div class="fr-info-value">${escapeHtml(studentName)}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Admission No :</div><div class="fr-info-value">${escapeHtml(student.admission_number || '—')}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Father's Name :</div><div class="fr-info-value">${escapeHtml(fatherName)}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Address :</div><div class="fr-info-value">${escapeHtml(formatStudentAddress(student).toUpperCase())}</div></div>
        </div>
        <div class="fr-info-col">
          <div class="fr-info-row"><div class="fr-info-label">Date :</div><div class="fr-info-value">${escapeHtml(formatReceiptDate(payment.payment_date))}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Class &amp; Section :</div><div class="fr-info-value">${escapeHtml(formatClassSection(student).toUpperCase())}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Mobile No. :</div><div class="fr-info-value">${escapeHtml(student.parent_phone || '—')}</div></div>
          <div class="fr-info-row"><div class="fr-info-label">Mother's Name :</div><div class="fr-info-value">${escapeHtml(motherName)}</div></div>
        </div>
      </div>

      <table class="fr-table">
        <thead>
          <tr>
            <th style="width:8%">S.No.</th>
            <th style="width:42%">Description</th>
            <th style="width:16%">Due</th>
            <th style="width:17%">Paid Amount</th>
            <th style="width:17%">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${feeRows}
          <tr>
            <td colspan="2" class="fr-center" style="font-weight:700;">TOTAL</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(displayTotal)}</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(displayTotal)}</td>
            <td class="fr-num" style="font-weight:700;">${formatAmount(totalBalance)}</td>
          </tr>
        </tbody>
      </table>

      <div class="fr-section-title">Pay Mode Information</div>
      <table class="fr-table">
        <thead>
          <tr>
            <th style="width:8%">Sr. No</th>
            <th style="width:22%">Pay Mode</th>
            <th style="width:18%">Bank</th>
            <th style="width:18%">Number</th>
            <th style="width:16%">Date</th>
            <th style="width:18%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="fr-center">1</td>
            <td>${escapeHtml(payMode)}</td>
            <td class="fr-center">${isBankPayment ? '—' : ''}</td>
            <td class="fr-center">${escapeHtml(payment.transaction_id || '')}</td>
            <td class="fr-center">${escapeHtml(formatReceiptDate(payment.payment_date))}</td>
            <td class="fr-num">${formatAmount(totalPaid, 2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="fr-remarks-row">
        <div>Remarks :</div>
        <div>${escapeHtml(payment.remarks || '')}</div>
      </div>

      <div class="fr-total-words">
        <span>Total in words : ${escapeHtml(numberToWords(Math.round(displayTotal)))}</span>
        <span>Total:${formatAmount(displayTotal)}</span>
      </div>

      <div class="fr-footer-grid">
        <div class="fr-footer-left fr-note">
          <strong>NOTE :</strong> 1.Fees can be paid in cash/cheque. Rs.100/- will be charged as penalty on a cheque bounce and only cash will be accepted after that.
        </div>
        <div class="fr-footer-right">
          <div style="font-weight:700;">${escapeHtml(receivedBy)}</div>
          <!-- <div>${escapeHtml(formatReceiptDateTime(payment.payment_date))}</div> -->
          <div class="fr-signature-no-line">Signature</div>
        </div>
      </div>
    </div>
  `;
}

export function buildFeeReceiptHtml(
  payment: FeeReceiptPayment,
  student: FeeReceiptStudent,
  settings: FeeReceiptSettings = {},
  renderOptions: { hideReceiptNo?: boolean } = {},
): string {
  return `<div id="receipt-content">${buildFeeReceiptInnerHtml(payment, student, settings, renderOptions)}</div>`;
}

export function buildFeeReceiptPrintDocument(
  payment: FeeReceiptPayment,
  student: FeeReceiptStudent,
  settings: FeeReceiptSettings = {},
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fee Receipt</title>
  <style>${FEE_RECEIPT_PRINT_STYLES}</style>
</head>
<body>
  ${buildFeeReceiptHtml(payment, student, settings)}
</body>
</html>`;
}

export function printFeeReceiptViaIframe(
  payment: FeeReceiptPayment,
  student: FeeReceiptStudent,
  settings: FeeReceiptSettings = {},
) {
  const html = buildFeeReceiptPrintDocument(payment, student, settings);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const printAndCleanup = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  if (iframe.contentWindow?.document.readyState === 'complete') {
    printAndCleanup();
  } else {
    iframe.onload = printAndCleanup;
  }
}