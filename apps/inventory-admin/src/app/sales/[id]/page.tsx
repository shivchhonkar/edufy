'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FiDownload, FiPrinter } from 'react-icons/fi'
import { Button } from '@edulakhya/ui'
import PrintableInventoryInvoice from '@/components/PrintableInventoryInvoice'
import { HTML2PDF_PAGE_MARGIN_MM } from '@edulakhya/utils'
import {
  printInventoryInvoiceViaIframe,
  type InventoryInvoiceData,
  type InventoryInvoiceLine,
  type InventoryInvoiceSchoolSettings,
  type InventoryInvoiceStudent,
} from '@/lib/inventory-invoice-print'

export default function InvoiceDetailPage() {
  const params = useParams()
  const invoiceId = params.id as string
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [invoice, setInvoice] = useState<InventoryInvoiceData | null>(null)
  const [items, setItems] = useState<InventoryInvoiceLine[]>([])
  const [student, setStudent] = useState<InventoryInvoiceStudent>({})
  const [school, setSchool] = useState<InventoryInvoiceSchoolSettings>({})

  useEffect(() => {
    if (!invoiceId) return

    const fetchInvoice = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/sales/${invoiceId}`)
        const data = await res.json()
        if (!data.success) {
          setError(data.error || 'Failed to load invoice')
          return
        }
        setInvoice(data.data.invoice)
        setItems(data.data.items || [])
        setStudent(data.data.student || {})
        setSchool(data.data.school || {})
      } catch {
        setError('Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId])

  const handlePrint = () => {
    if (!invoice) return
    printInventoryInvoiceViaIframe(invoice, items, student, school)
  }

  const handleDownloadPDF = async () => {
    if (!invoice || !invoiceRef.current) return
    setDownloading(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `Invoice_${invoice.invoice_number || invoiceId}.pdf`

      await html2pdf()
        .set({
          margin: HTML2PDF_PAGE_MARGIN_MM,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all'] },
        } as any)
        .from(invoiceRef.current)
        .save()
    } catch (err) {
      console.error('Error generating PDF:', err)
      window.alert('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-xl text-gray-900">Sales Invoice</h1>
              <p className="text-sm text-gray-600">
                {invoice?.invoice_number || `Invoice #${invoiceId}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {invoice && (
                <>
                  <Button onClick={handlePrint} className="flex items-center gap-2">
                    <FiPrinter size={18} />
                    Print (A4)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="flex items-center gap-2"
                  >
                    <FiDownload size={18} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </>
              )}
              <Link href="/reports">
                <Button variant="outline">Back to Reports</Button>
              </Link>
              <Link href="/sales">
                <Button>New Sale</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 print:hidden">
            Loading invoice...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-red-600 print:hidden">
            {error}
          </div>
        )}

        {!loading && !error && invoice && (
          <div ref={invoiceRef} className="bg-white rounded-lg shadow p-1 sm:p-1">
            <PrintableInventoryInvoice
              invoice={invoice}
              items={items}
              student={student}
              school={school}
            />
          </div>
        )}
      </div>
    </div>
  )
}
