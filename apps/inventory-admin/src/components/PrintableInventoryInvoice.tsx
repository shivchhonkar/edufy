'use client'

import React, { useMemo } from 'react'
import {
  buildInventoryInvoiceInnerHtml,
  INVENTORY_INVOICE_PREVIEW_STYLES,
  type InventoryInvoiceData,
  type InventoryInvoiceLine,
  type InventoryInvoiceSchoolSettings,
  type InventoryInvoiceStudent,
} from '@/lib/inventory-invoice-print'

interface PrintableInventoryInvoiceProps {
  invoice: InventoryInvoiceData
  items: InventoryInvoiceLine[]
  student: InventoryInvoiceStudent
  school: InventoryInvoiceSchoolSettings
}

export default function PrintableInventoryInvoice({
  invoice,
  items,
  student,
  school,
}: PrintableInventoryInvoiceProps) {
  const invoiceHtml = useMemo(
    () => buildInventoryInvoiceInnerHtml(invoice, items, student, school),
    [invoice, items, student, school],
  )

  return (
    <div className="inventory-invoice-preview w-full bg-white text-[10pt] leading-snug">
      <style dangerouslySetInnerHTML={{ __html: INVENTORY_INVOICE_PREVIEW_STYLES }} />
      <div id="invoice-content" dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
    </div>
  )
}
