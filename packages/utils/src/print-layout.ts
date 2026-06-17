/** html2pdf.js margins in mm — 80% less than previous 20mm sides */
export const HTML2PDF_PAGE_MARGIN_MM: [number, number, number, number] = [4, 4, 4, 4]

/** @page margin helper — 80% less than typical 8–10mm */
export const PRINT_PAGE_MARGIN_MM = '2mm'

export const FR_RECEIPT_CONTENT_STYLES = `
  .fr-sheet {
    width: 100%;
    border: 1.5px solid #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #111;
    line-height: 1.45;
  }
  .fr-header {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 2px;
    padding: 2px 3px 2px;
    border-bottom: 1px solid #111;
    align-items: start;
  }
  .fr-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
  }
  .fr-logo-placeholder {
    width: 64px;
    height: 64px;
    border: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    color: #666;
    text-align: center;
  }
  .fr-school-name {
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
  .fr-school-meta {
    text-align: center;
    font-size: 9pt;
    margin-top: 1px;
  }
  .fr-receipt-title {
    text-align: center;
    font-weight: 700;
    font-size: 11pt;
    padding: 2px 2px;
    border-top: 1px solid #111;
    border-bottom: 1px solid #111;
    letter-spacing: 0.03em;
  }
  .fr-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #111;
    padding: 2px 2px;
    gap: 0 4px;
  }
  .fr-info-col {
    padding: 0;
  }
  .fr-info-row {
    display: grid;
    grid-template-columns: 9.5rem 1fr;
    min-height: 0.4rem;
  }
  .fr-info-label,
  .fr-info-value {
    padding: 1px 0;
  }
  .fr-info-value {
    padding-left: 2px;
    text-transform: uppercase;
  }
  .fr-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .fr-table th,
  .fr-table td {
    border: 1px solid #111;
    padding: 1px 2px;
    vertical-align: top;
    word-break: break-word;
  }
  .fr-table th {
    font-weight: 700;
    text-align: center;
    background: #f8f8f8;
  }
  .fr-table .fr-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .fr-table .fr-center {
    text-align: center;
  }
  .fr-section-title {
    text-align: center;
    font-weight: 700;
    padding: 1px 2px;
    border-top: 1px solid #111;
    border-bottom: 1px solid #111;
    background: #f8f8f8;
  }
  .fr-footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #111;
  }
  .fr-footer-left,
  .fr-footer-right {
    padding: 2px;
    min-height: 20px;
  }
  .fr-footer-right {
    border-left: 1px solid #111;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 1px;
  }
  .fr-remarks-row {
    display: grid;
    grid-template-columns: 5.5rem 1fr;
    border-top: 1px solid #111;
    border-bottom: 1px solid #111;
  }
  .fr-remarks-row > div {
    padding: 1px 2px;
  }
  .fr-remarks-row > div:first-child {
    border-right: 1px solid #111;
    font-weight: 700;
  }
  .fr-total-words {
    display: flex;
    justify-content: space-between;
    gap: 2px;
    padding: 2px 2px;
    border-bottom: 1px solid #111;
    font-weight: 700;
  }
  .fr-note {
    font-size: 8.5pt;
    line-height: 1.4;
  }
  .fr-signature-line {
    margin-top: 5px;
    border-top: 1px solid #111;
    padding-top: 1px;
    font-size: 9pt;
  }
`

export const RECEIPT_PRINT_DOCUMENT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 2mm 0 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.35;
  }
  #receipt-content,
  #invoice-content {
    width: 100%;
    max-width: 206mm;
    page-break-inside: avoid;
  }
  ${FR_RECEIPT_CONTENT_STYLES}
`

export const RECEIPT_PREVIEW_STYLES = `
  .fee-receipt-preview #receipt-content,
  .inventory-invoice-preview #invoice-content {
    width: 100%;
    max-width: 206mm;
    margin: 0 auto;
  }
  .fee-receipt-preview .fr-sheet,
  .inventory-invoice-preview .fr-sheet {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  ${FR_RECEIPT_CONTENT_STYLES}
`
