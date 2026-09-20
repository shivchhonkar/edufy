import {
  buildFeeReceiptPrintDocument,
  type FeeReceiptLineItem,
  type FeeReceiptSettings,
  type FeeReceiptStudent,
} from '@/features/fees/utils/fee-receipt-print';
import { inventoryItemLabel } from './item-label';

type InvoiceLine = {
  item_name?: string | null;
  size?: string | null;
  item_code?: string | null;
  unit?: string | null;
  quantity?: number | string;
  unit_price?: number | string;
};

export type InvoiceDoc = {
  doc_no?: string;
  doc_date?: string;
  party_name?: string | null;
  party_type?: string | null;
  remarks?: string | null;
  lines?: InvoiceLine[];
  party?: FeeReceiptStudent | null;
};

function splitName(name?: string | null) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
}

function printGeneratedHtml(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Print invoice');
  frame.src = url;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(frame);

  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 2000);
    }
  };

  frame.onload = runPrint;
  setTimeout(runPrint, 600);
}

export function printInventoryInvoice(doc: InvoiceDoc, settings: FeeReceiptSettings = {}) {
  const lineItems: FeeReceiptLineItem[] = (doc.lines || []).map((line) => {
    const qty = Number(line.quantity || 0);
    const rate = Number(line.unit_price || 0);
    const amount = qty * rate;
    const unit = line.unit ? ` ${line.unit}` : '';
    const label = `${inventoryItemLabel(line)} × ${qty}${unit} @ ₹${rate.toFixed(2)}`;
    return { label, due: amount, paid: amount, balance: 0 };
  });
  if (!lineItems.length) {
    throw new Error('This document has no items to print.');
  }
  const total = lineItems.reduce((sum, item) => sum + item.paid, 0);
  const fallbackName = splitName(doc.party_name);
  const party = doc.party || {};
  const student: FeeReceiptStudent = {
    first_name: party.first_name || fallbackName.first_name,
    last_name: party.last_name || fallbackName.last_name,
    admission_number: party.admission_number,
    class_name: party.class_name || (doc.party_type === 'staff' ? 'Staff' : doc.party_type === 'department' ? 'Department' : ''),
    section_name: party.section_name,
    parent_name: party.parent_name,
    parent_phone: party.parent_phone,
    mother_name: party.mother_name,
    address: party.address,
    city: party.city,
    state: party.state,
  };

  const html = buildFeeReceiptPrintDocument(
    {
      receipt_number: doc.doc_no,
      payment_date: doc.doc_date,
      payment_method: 'cash',
      amount_paid: total,
      remarks: doc.remarks || 'Inventory sale',
      line_items: lineItems,
    },
    student,
    {
      ...settings,
      document_title: 'INVOICE',
    }
  );
  printGeneratedHtml(html);
}
