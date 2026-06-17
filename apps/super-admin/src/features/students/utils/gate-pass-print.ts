import type { GatePassDocumentData, GatePassSchoolInfo } from '@/features/students/components/GatePassDocument';
import { GATE_PASS_APPROVAL_LABELS } from '@/lib/gate-pass-utils';

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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function relationshipLabel(value: string) {
  const labels: Record<string, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    relative: 'Relative',
    other: 'Other',
  };
  return labels[value] || value;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    margin: 0;
    padding: 10mm 6mm;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #0f172a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  .gate-pass-sheet {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    border: 2px solid #1e40af;
    border-radius: 6px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .gp-header {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 9px;
    border-bottom: 4px solid #2563eb;
    background: linear-gradient(to right, #f8fafc, #fff);
  }
  .gp-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    flex-shrink: 0;
  }
  .gp-logo-fallback {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    background: #2563eb;
    color: #fff;
    font-weight: 700;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .gp-school-name {
    font-size: 17pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
  }
  .gp-school-year {
    font-size: 9pt;
    color: #1d4ed8;
    font-weight: 600;
    margin-top: 2px;
  }
  .gp-school-meta {
    margin-top: 8px;
    font-size: 9pt;
    color: #475569;
    line-height: 1.5;
  }
  .gp-title-bar {
    background: #2563eb;
    color: #fff;
    padding: 10px 9px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .gp-title-bar h2 {
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .gp-status {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.15);
  }
  .gp-meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    border-bottom: 1px solid #e2e8f0;
  }
  .gp-meta-cell {
    padding: 12px 8px;
    border-right: 1px solid #e2e8f0;
  }
  .gp-meta-cell:last-child { border-right: none; }
  .gp-meta-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .gp-meta-value {
    font-size: 10pt;
    font-weight: 600;
    color: #0f172a;
  }
  .gp-meta-value.mono {
    font-family: ui-monospace, monospace;
    font-size: 9.5pt;
    color: #1e40af;
  }
  .gp-body {
    padding: 16px 9px;
  }
  .gp-body-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .gp-section-title {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1d4ed8;
    border-bottom: 1px solid #dbeafe;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .gp-section { margin-bottom: 16px; }
  .gp-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }
  .gp-field-full { grid-column: 1 / -1; }
  .gp-field-label {
    font-size: 8pt;
    color: #64748b;
    margin-bottom: 2px;
  }
  .gp-field-value {
    font-size: 10.5pt;
    font-weight: 600;
    color: #0f172a;
  }
  .gp-field-value.mono { font-family: ui-monospace, monospace; font-size: 9.5pt; }
  .gp-reason {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 10pt;
    line-height: 1.5;
    min-height: 48px;
  }
  .gp-photo-wrap {
    text-align: center;
    min-width: 0;
  }
  .gp-photo-sublabel {
    font-size: 7.5pt;
    color: #94a3b8;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gp-photos-grid {
    display: grid;
    gap: 12px;
    margin-top: 10px;
  }
  .gp-photo-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 8px;
  }
  .gp-photo-box {
    width: 100%;
    height: 38mm;
    border: 2px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gp-photo-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gp-photo-empty {
    font-size: 8.5pt;
    color: #94a3b8;
    padding: 8px;
  }
  .gp-footer {
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 12px 9px 14px;
  }
  .gp-footer-title {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
    margin-bottom: 10px;
  }
  .gp-footer-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .gp-footer-note {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #64748b;
  }
  @media print {
    html, body {
      width: 100%;
      margin: 0;
      padding: 10mm 6mm;
    }
    .gate-pass-sheet { max-width: none; border-radius: 0; }
  }
`;

function buildPhotoSlotsHtml(record: GatePassDocumentData): string {
  const slots: Array<{ label: string; sublabel?: string; url: string; emptyText: string }> = [];

  if (record.student_snapshot?.photo_url?.trim()) {
    slots.push({
      label: 'Student',
      sublabel: record.student_snapshot.full_name,
      url: toAbsoluteUrl(record.student_snapshot.photo_url),
      emptyText: '',
    });
  }

  for (const guardian of record.student_snapshot?.guardian_photos || []) {
    if (!guardian.photo_url?.trim()) continue;
    slots.push({
      label: relationshipLabel(guardian.relation_type),
      sublabel: guardian.name,
      url: toAbsoluteUrl(guardian.photo_url),
      emptyText: '',
    });
  }

  slots.push({
    label: 'Collector',
    sublabel: record.collector_name,
    url: toAbsoluteUrl(record.collector_photo_url),
    emptyText: 'Capture at gate',
  });

  const cols = Math.min(slots.length, 4);

  const cells = slots
    .map((slot) => {
      const photoInner = slot.url
        ? `<img src="${escapeHtml(slot.url)}" alt="${escapeHtml(slot.label)}" />`
        : `<span class="gp-photo-empty">${escapeHtml(slot.emptyText)}</span>`;
      return `<div class="gp-photo-wrap">
        <div class="gp-photo-label">${escapeHtml(slot.label)}</div>
        ${slot.sublabel ? `<div class="gp-photo-sublabel">${escapeHtml(slot.sublabel)}</div>` : ''}
        <div class="gp-photo-box">${photoInner}</div>
      </div>`;
    })
    .join('');

  return `<div class="gp-section">
    <div class="gp-section-title">Photographs</div>
    <div class="gp-photos-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">
      ${cells}
    </div>
  </div>`;
}

export function buildGatePassPrintHtml(
  record: GatePassDocumentData,
  school: GatePassSchoolInfo
): string {
  const classSection = [record.student_snapshot?.class_name, record.student_snapshot?.section_name]
    .filter(Boolean)
    .join(' · ');

  const logoUrl = toAbsoluteUrl(school.logoUrl);
  const photosHtml = buildPhotoSlotsHtml(record);

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" class="gp-logo" />`
    : `<div class="gp-logo-fallback">${escapeHtml(school.name.charAt(0))}</div>`;

  const contactParts: string[] = [];
  if (school.address?.trim()) contactParts.push(escapeHtml(school.address));
  if (school.phone?.trim()) contactParts.push(`Tel: ${escapeHtml(school.phone)}`);
  if (school.email?.trim()) contactParts.push(escapeHtml(school.email));

  const approvalLabel = record.approval_method
    ? GATE_PASS_APPROVAL_LABELS[record.approval_method] || record.approval_method
    : '—';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  <base href="${escapeHtml(origin)}/" />
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="gate-pass-sheet">
    <header class="gp-header">
      ${logoBlock}
      <div>
        <div class="gp-school-name">${escapeHtml(school.name)}</div>
        ${school.academicYear ? `<div class="gp-school-year">Academic Year ${escapeHtml(school.academicYear)}</div>` : ''}
        ${contactParts.length ? `<div class="gp-school-meta">${contactParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
      </div>
    </header>

    <div class="gp-title-bar">
      <h2>Student Gate Pass</h2>
      <span class="gp-status">${escapeHtml(record.status)}</span>
    </div>

    <div class="gp-meta-row">
      <div class="gp-meta-cell">
        <div class="gp-meta-label">Pass Number</div>
        <div class="gp-meta-value mono">${escapeHtml(record.pass_number)}</div>
      </div>
      <div class="gp-meta-cell">
        <div class="gp-meta-label">Issued On</div>
        <div class="gp-meta-value">${escapeHtml(formatDateTime(record.created_at))}</div>
      </div>
      <div class="gp-meta-cell">
        <div class="gp-meta-label">Exit Date &amp; Time</div>
        <div class="gp-meta-value">${escapeHtml(record.exit_at ? formatDateTime(record.exit_at) : 'Pending authorization')}</div>
      </div>
    </div>

    <div class="gp-body">
      <div class="gp-body-columns">
        <div class="gp-section">
          <div class="gp-section-title">Student Details</div>
          <div class="gp-fields">
            <div>
              <div class="gp-field-label">Name</div>
              <div class="gp-field-value">${escapeHtml(record.student_snapshot?.full_name || '—')}</div>
            </div>
            <div>
              <div class="gp-field-label">Admission No.</div>
              <div class="gp-field-value mono">${escapeHtml(record.student_snapshot?.admission_number || '—')}</div>
            </div>
            <div class="gp-field-full">
              <div class="gp-field-label">Class / Section</div>
              <div class="gp-field-value">${escapeHtml(classSection || '—')}</div>
            </div>
          </div>
        </div>

        <div class="gp-section">
          <div class="gp-section-title">Person Collecting Student</div>
          <div class="gp-fields">
            <div>
              <div class="gp-field-label">Name</div>
              <div class="gp-field-value">${escapeHtml(record.collector_name)}</div>
            </div>
            <div>
              <div class="gp-field-label">Relationship</div>
              <div class="gp-field-value">${escapeHtml(relationshipLabel(record.collector_relationship))}</div>
            </div>
            <div class="gp-field-full">
              <div class="gp-field-label">Mobile</div>
              <div class="gp-field-value mono">${escapeHtml(record.collector_mobile)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="gp-section">
        <div class="gp-section-title">Reason for Early Departure</div>
        <div class="gp-reason">${escapeHtml(record.reason)}</div>
      </div>

      ${photosHtml}
    </div>

    <footer class="gp-footer">
      <div class="gp-footer-title">Authorization &amp; Audit</div>
      <div class="gp-footer-grid">
        <div>
          <div class="gp-field-label">Approval Method</div>
          <div class="gp-field-value">${escapeHtml(approvalLabel)}</div>
        </div>
        <div>
          <div class="gp-field-label">Approved By</div>
          <div class="gp-field-value">${escapeHtml(record.approved_by_name || '—')}</div>
        </div>
        <div>
          <div class="gp-field-label">Issued By</div>
          <div class="gp-field-value">${escapeHtml(record.created_by_name || '—')}</div>
        </div>
        <div>
          <div class="gp-field-label">OTP Sent To</div>
          <div class="gp-field-value mono">${escapeHtml(record.otp_sent_to_mobile || '—')}</div>
        </div>
      </div>
      ${record.approved_at ? `<p class="gp-footer-note">Approved at ${escapeHtml(formatDateTime(record.approved_at))}</p>` : ''}
    </footer>
  </div>
</body>
</html>`;
}

export function printGatePassViaIframe(
  record: GatePassDocumentData,
  school: GatePassSchoolInfo
) {
  const html = buildGatePassPrintHtml(record, school);
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
