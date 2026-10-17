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

function particularsRow(index: number, label: string, value?: string | null): string {
  const display = value?.trim() || '—';
  return `<tr><td class="idx">${index}</td><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(display)}</td></tr>`;
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

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" class="logo-img" />`
    : '<div class="logo-spacer"></div>';

  const signatureBlock = signatureUrl
    ? `<img src="${escapeHtml(signatureUrl)}" alt="Principal signature" class="signature-img" />`
    : school.principalName
      ? `<p class="signature-name">${escapeHtml(school.principalName)}</p>`
      : '<div class="signature-gap"></div>';

  const photoBlock = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" class="student-photo" />`
    : '<div class="logo-spacer"></div>';

  const contact = [school.phone, school.email].filter(Boolean).join('  ·  ');
  const rows = [
    particularsRow(1, 'Date of birth', formatStudentDate(student.date_of_birth)),
    particularsRow(2, 'Gender', student.gender),
    particularsRow(3, 'Admission number', student.admission_number),
    particularsRow(4, 'Date of admission', formatStudentDate(student.admission_date)),
    particularsRow(5, 'Class last attended', classPhrase),
    particularsRow(6, 'Date of leaving', formatStudentDate(options.dateOfLeaving)),
    particularsRow(7, 'Qualified for promotion', options.qualifiedForPromotion),
    particularsRow(8, 'Conduct and character', options.conduct),
    particularsRow(9, 'Reason for leaving', options.reasonForLeaving),
  ].join('');

  return `
    <section class="tc-sheet">
      <div class="tc-frame">
        <header class="tc-header">
          ${logoBlock}
          <div class="tc-header-center">
            <p class="school-kicker">${escapeHtml(school.academicYear || 'School record')}</p>
            <p class="school-name">${escapeHtml(school.name)}</p>
            ${addressHtml}
            ${contact ? `<p class="school-contact">${escapeHtml(contact)}</p>` : ''}
          </div>
          ${photoBlock}
        </header>
        <div class="tc-title-row">
          <span class="rule"></span>
          <h2 class="tc-title">Transfer Certificate</h2>
          <span class="rule"></span>
        </div>
        <div class="tc-meta">
          <p><span class="meta-label">TC No.</span> <span class="tc-number-value">${escapeHtml(options.tcNumber)}</span></p>
          <p><span class="meta-label">Date of issue</span> <strong>${escapeHtml(formatStudentDate(options.issueDate))}</strong></p>
        </div>
        <p class="tc-intro">
          This is to certify that ${relationText}
          <strong>${escapeHtml(student.parent_name?.trim() || '—')}</strong>, named
          <strong>${escapeHtml(fullName || '—')}</strong>${rollText},
          was a bonafide student of this institution.
        </p>
        <table class="particulars"><tbody>${rows}</tbody></table>
        <p class="tc-close">
          ${escapeHtml(fullName || 'The student')} has no dues pending against him/her in this
          school. His/Her character and conduct during the stay were
          <strong>${escapeHtml(options.conduct || 'satisfactory')}</strong>. This certificate is
          issued at the request of the parent or guardian for admission to another school.
        </p>
        <footer class="tc-footer">
          <div class="tc-footer-left">
            <p><span class="meta-label">Place</span> ${escapeHtml(place || '—')}</p>
            <p><span class="meta-label">Date</span> ${escapeHtml(formatStudentDate(options.issueDate))}</p>
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
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #0f172a;
    font-family: Georgia, "Times New Roman", serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tc-sheet { page-break-after: always; }
  .tc-sheet:last-child { page-break-after: auto; }
  .tc-frame {
    position: relative;
    border: 2.5px solid #0f172a;
    padding: 10mm 12mm;
    min-height: 270mm;
  }
  .tc-frame:before {
    content: "";
    position: absolute;
    inset: 2mm;
    border: 1px solid #94a3b8;
    pointer-events: none;
  }
  .tc-header {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
    text-align: center;
  }
  .logo-img, .student-photo, .logo-spacer {
    width: 64px;
    height: 64px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .student-photo { object-fit: cover; border: 1px solid #cbd5e1; width: 58px; height: 72px; }
  .tc-header-center { flex: 1; min-width: 0; }
  .school-kicker {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: #64748b;
  }
  .school-name {
    margin: 4px 0 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .school-address, .school-contact {
    margin: 4px auto 0;
    max-width: 420px;
    font-size: 11px;
    line-height: 1.45;
    color: #475569;
  }
  .tc-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
  }
  .rule { flex: 1; height: 1px; background: #0f172a; }
  .tc-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }
  .tc-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    padding: 6px 0;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
  }
  .tc-meta p { margin: 0; }
  .meta-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #64748b;
  }
  .tc-number-value {
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
    font-weight: 700;
  }
  .tc-intro, .tc-close {
    margin: 16px 0 0;
    font-size: 13.5px;
    line-height: 1.7;
    text-align: justify;
  }
  table.particulars {
    width: 100%;
    margin-top: 14px;
    border-collapse: collapse;
    border: 1px solid #cbd5e1;
  }
  table.particulars td {
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 10px;
    vertical-align: top;
  }
  table.particulars tr:last-child td { border-bottom: 0; }
  td.idx { width: 28px; text-align: center; font-size: 11px; color: #64748b; }
  td.label {
    width: 42%;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
  }
  td.value { font-size: 13px; }
  .tc-footer {
    margin-top: 28mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }
  .tc-footer-left { font-size: 12px; line-height: 1.7; }
  .tc-footer-left p { margin: 0; }
  .tc-footer-right { width: 160px; text-align: center; }
  .signature-img { max-height: 48px; max-width: 140px; object-fit: contain; }
  .signature-name {
    margin: 0 0 2px;
    font-size: 18px;
    font-family: "Segoe Script", "Brush Script MT", cursive;
  }
  .signature-gap { height: 40px; }
  .signature-line { border-top: 1px solid #0f172a; }
  .principal-label {
    margin: 4px 0 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .principal-school { margin: 2px 0 0; font-size: 11px; color: #64748b; }
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
