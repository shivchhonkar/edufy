import { HTML2PDF_PAGE_MARGIN_MM } from '@edulakhya/utils';

export async function downloadReportElementAsPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
) {
  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .set({
      margin: HTML2PDF_PAGE_MARGIN_MM,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(element)
    .save();
}

export function printReportElement(element: HTMLElement) {
  const styleId = 'single-report-print-style';
  const rootId = 'single-report-print-root';

  const existingStyle = document.getElementById(styleId);
  existingStyle?.remove();
  document.getElementById(rootId)?.remove();

  const root = document.createElement('div');
  root.id = rootId;
  root.appendChild(element.cloneNode(true));
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @media print {
      body > *:not(#${rootId}) { display: none !important; }
      #${rootId} {
        display: block !important;
        position: static !important;
        width: 100% !important;
      }
      @page { size: A4 portrait; margin: 2mm; }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    document.getElementById(rootId)?.remove();
    document.getElementById(styleId)?.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  window.setTimeout(cleanup, 1000);
}

export function buildReportCardFilename(
  prefix: string,
  admissionNumber: string,
  firstName: string,
  lastName: string,
) {
  const slug = `${firstName}_${lastName}`.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_');
  return `${prefix}_${admissionNumber || slug}.pdf`;
}
