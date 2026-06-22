import type { Student } from '@/shared/types';
import type {
  TransferCertificateOptions,
  TransferCertificateSchoolInfo,
} from '@/features/students/components/TransferCertificate';
import { formatStudentDate, studentFullName } from '@/features/students/utils/student-profile';
import { splitAddressIntoTwoLines } from '@/features/students/utils/school-document-utils';

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toAbsoluteUrl(url?: string | null): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function formatClassPhrase(className?: string | null, sectionName?: string | null): string {
  const classSection = [className, sectionName].filter(Boolean).join(' - ').trim();
  if (!classSection) return '';
  if (/^class\b/i.test(classSection)) return classSection;
  return `Class ${classSection}`;
}

function genderLabel(gender?: string | null): string {
  if (!gender) return '';
  if (gender === 'Male') return 'Son';
  if (gender === 'Female') return 'Daughter';
  return 'Child';
}

function infoLine(label: string, value?: string | null): string {
  const display = value?.trim() || '';
  return `<p class="info-line"><span class="info-label">${escapeHtml(label)}:</span> ${escapeHtml(display)}</p>`;
}

function buildSingleCertificateHtml(
  student: Student,
  school: TransferCertificateSchoolInfo,
  options: TransferCertificateOptions
): string {
  const fullName = studentFullName(student);
  const relation = genderLabel(student.gender);
  const classPhrase = formatClassPhrase(student.class_name, student.section_name);
  const logoUrl = toAbsoluteUrl(school.logoUrl);
  const signatureUrl = toAbsoluteUrl(school.signatureUrl);
  const photoUrl = toAbsoluteUrl(student.photo_url);
  const place =
    student.city?.trim() || school.address?.split(',').pop()?.trim() || '';
  const [addressLine1, addressLine2] = splitAddressIntoTwoLines(school.address);
  const addressHtml =
    addressLine1 || addressLine2
      ? `<p class="school-address">${escapeHtml(addressLine1)}${
          addressLine2 ? `<br />${escapeHtml(addressLine2)}` : ''
        }</p>`
      : '';

  const relationText = relation
    ? `<strong>${escapeHtml(relation)}</strong> of`
    : 'ward of';

  const rollText = student.roll_number
    ? ` and Roll No. <strong>${escapeHtml(student.roll_number)}</strong>`
    : '';

  const classText = classPhrase
    ? ` in <strong>${escapeHtml(classPhrase)}</strong>`
    : '';

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" class="logo-img" />`
    : `<div class="logo-placeholder">LOGO</div>`;

  const signatureBlock = signatureUrl
    ? `<img src="${escapeHtml(signatureUrl)}" alt="Principal signature" class="signature-img" />`
    : school.principalName
      ? `<p class="signature-name">${escapeHtml(school.principalName)}</p>`
      : '';

  const photoBlock = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" class="student-photo" />`
    : '';

  return `
    <section class="tc-sheet">
      <div class="tc-page">
        ${photoBlock}
        <header class="tc-header">
          ${logoBlock}
          <div class="tc-header-center">
            <h1 class="school-name">${escapeHtml(school.name)}</h1>
            ${school.academicYear ? `<p class="school-year">${escapeHtml(school.academicYear)}</p>` : ''}
            ${addressHtml}
          </div>
        </header>
        <p class="tc-number-row">
          <span class="tc-number-label">TC No.</span>
          <span class="tc-number-value">${escapeHtml(options.tcNumber)}</span>
        </p>

        <h2 class="tc-title">Transfer Certificate</h2>

        <div class="tc-body">
          <p class="tc-intro">
            This is to certify that ${relationText}
            <strong>${escapeHtml(student.parent_name?.trim() || '')}</strong>, named
            <strong>${escapeHtml(fullName || '')}</strong>, bearing Admission No.
            <strong>${escapeHtml(student.admission_number?.trim() || '')}</strong>${rollText},
            was a bonafide student of this institution${classText}.
          </p>

          <div class="tc-details">
            ${infoLine('Date of Birth', formatStudentDate(student.date_of_birth))}
            ${infoLine('Gender', student.gender)}
            ${infoLine('Date of Admission', formatStudentDate(student.admission_date))}
            ${infoLine('Date of Leaving', formatStudentDate(options.dateOfLeaving))}
            ${infoLine('Qualified for promotion to higher class', options.qualifiedForPromotion)}
            ${infoLine('Conduct and Character', options.conduct)}
            ${infoLine('Reason for leaving', options.reasonForLeaving)}
          </div>

          <p>
            ${escapeHtml(fullName || 'The student')} has no dues pending against him/her in this
            school. His/Her character and conduct during the stay were
            <strong>${escapeHtml(options.conduct || 'satisfactory')}</strong>.
          </p>

          <p>
            This certificate is issued at the request of the parent/guardian for the purpose of
            admission to another school.
          </p>
        </div>

        <footer class="tc-footer">
          <div class="tc-footer-left">
            <p><span class="info-label">Date of Issue:</span> ${escapeHtml(formatStudentDate(options.issueDate))}</p>
            <p><span class="info-label">Place:</span> ${escapeHtml(place)}</p>
          </div>
          <div class="tc-footer-right">
            ${signatureBlock}
            <div class="signature-line"></div>
            <p class="principal-label">Principal</p>
            <p class="principal-school">${escapeHtml(school.name)}</p>
          </div>
        </footer>
      </div>
    </section>`;
}

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tc-sheet {
    page-break-after: always;
  }
  .tc-sheet:last-child {
    page-break-after: auto;
  }
  .tc-page {
    position: relative;
    width: 210mm;
    min-height: 277mm;
    margin: 0 auto;
    padding: 12mm 15mm;
  }
  .tc-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 2px solid #155FA8;
    padding-bottom: 16px;
    margin-bottom: 8px;
  }
  .logo-img {
    width: 72px;
    height: 72px;
    object-fit: contain;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1px;
    flex-shrink: 0;
  }
  .logo-placeholder {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #EBF5FC;
    color: #155FA8;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .tc-header-center {
    flex: 1;
    min-width: 0;
    text-align: center;
  }
  .school-name {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.25;
    color: #0D3D75;
  }
  .school-year {
    margin: 8px 0 0;
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
  }
  .school-address {
    margin: 8px auto 0;
    max-width: 420px;
    font-size: 11px;
    line-height: 1.55;
    color: #4b5563;
  }
  .tc-number-row {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 8px;
    margin: 16px 0 0;
    white-space: nowrap;
    font-size: 14px;
    color: #111827;
  }
  .tc-number-label {
    font-weight: 600;
    color: #374151;
  }
  .tc-number-value {
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0D3D75;
  }
  .tc-title {
    margin: 32px 0 0;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    text-decoration: underline;
    text-decoration-color: #1A73C7;
    text-underline-offset: 6px;
  }
  .tc-body {
    margin-top: 40px;
    font-size: 14px;
    line-height: 1.85;
    color: #1f2937;
  }
  .tc-intro { margin: 0 0 20px; }
  .tc-details {
    margin: 0 0 20px;
    padding: 16px 20px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: rgba(249, 250, 251, 0.8);
  }
  .info-line {
    margin: 0 0 6px;
    font-size: 14px;
    line-height: 1.65;
  }
  .info-label { font-weight: 600; }
  .tc-footer {
    margin-top: 64px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }
  .tc-footer-left {
    font-size: 14px;
    color: #374151;
  }
  .tc-footer-left p { margin: 0 0 6px; }
  .tc-footer-right {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .signature-img {
    max-height: 48px;
    max-width: 140px;
    object-fit: contain;
    margin-bottom: 1px;
  }
  .signature-name {
    margin: 0 0 1px;
    font-size: 18px;
    color: #1A73C7;
    font-family: "Segoe Script", "Brush Script MT", cursive;
  }
  .signature-line {
    width: 160px;
    border-top: 1px solid #9ca3af;
  }
  .principal-label {
    margin: 1px 0 0;
    font-size: 14px;
    font-weight: 600;
  }
  .principal-school {
    margin: 1px 0 0;
    font-size: 12px;
    color: #6b7280;
  }
  .student-photo {
    position: absolute;
    right: 15mm;
    top: 52mm;
    width: 80px;
    height: 96px;
    object-fit: cover;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
`;

export function buildTransferCertificatePrintHtml(
  students: Student[],
  school: TransferCertificateSchoolInfo,
  optionsByStudent: Record<number, TransferCertificateOptions>
): string {
  const sheets = students
    .map((student) => {
      const options = optionsByStudent[student.id];
      if (!options) return '';
      return buildSingleCertificateHtml(student, school, options);
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Transfer Certificate</title>
  <base href="${escapeHtml(typeof window !== 'undefined' ? `${window.location.origin}/` : '/')}" />
  <style>${PRINT_STYLES}</style>
</head>
<body>${sheets}</body>
</html>`;
}

export function printTransferCertificatesViaIframe(
  students: Student[],
  school: TransferCertificateSchoolInfo,
  optionsByStudent: Record<number, TransferCertificateOptions>
) {
  const html = buildTransferCertificatePrintHtml(students, school, optionsByStudent);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';

  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  const printWindow = iframe.contentWindow;
  const doc = iframe.contentDocument ?? printWindow?.document;
  if (!doc || !printWindow) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60000);
    printWindow.print();
  };

  const images = Array.from(doc.images);
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

  window.setTimeout(triggerPrint, 2500);
}
