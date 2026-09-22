'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiFilePlus, FiPrinter, FiShoppingCart } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import InventoryModuleLinks from './InventoryModuleLinks';
import InventoryPurchaseRequestModal from './InventoryPurchaseRequestModal';
import InventorySellModal from './InventorySellModal';
import { inventoryItemLabel } from '../item-label';
import { printInventoryInvoice } from '../print-invoice';

type Item = { id: number; item_name: string; item_code?: string; unit?: string; unit_price?: number; quantity?: number; size?: string | null };
type Location = { id: number; name: string };
type Vendor = { id: number; name: string };
type Line = { item_id: string; quantity: string; unit_price: string; counted_qty: string };
type Doc = {
  id: number;
  doc_no: string;
  doc_date: string;
  status: string;
  party_name?: string;
  vendor_name?: string;
  location_name?: string;
};

const EMPTY_LINE: Line = { item_id: '', quantity: '1', unit_price: '0', counted_qty: '' };

export default function InventoryDocumentPage({
  kind,
  title,
  description,
  showVendor,
  showParty,
  partyTypes = ['student', 'staff', 'department'],
  showToLocation,
  showPrice,
  showCounted,
  postRequiresApprove,
  allowInOutToggle,
  useModalForm,
}: {
  kind: string;
  title: string;
  description: string;
  showVendor?: boolean;
  showParty?: boolean;
  partyTypes?: string[];
  showToLocation?: boolean;
  showPrice?: boolean;
  showCounted?: boolean;
  postRequiresApprove?: boolean;
  allowInOutToggle?: boolean;
  useModalForm?: boolean;
}) {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [activeKind, setActiveKind] = useState(kind);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    location_id: '',
    to_location_id: '',
    vendor_id: '',
    party_type: partyTypes[0] || 'student',
    party_id: '',
    party_name: '',
    remarks: '',
  });
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyHits, setPartyHits] = useState<{ id: number; name: string; code?: string }[]>([]);
  const [sellOpen, setSellOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const isPurchaseRequestModal = useModalForm && kind === 'pr';
  const isSellModal = useModalForm && (kind === 'sale' || kind === 'issue');

  const load = useCallback(async () => {
    const [iRes, lRes, vRes, dRes] = await Promise.all([
      fetch('/api/inventory/items', { cache: 'no-store' }),
      fetch('/api/inventory/masters/locations', { cache: 'no-store' }),
      fetch('/api/inventory/masters/vendors', { cache: 'no-store' }),
      fetch(`/api/inventory/documents?kind=${activeKind}`, { cache: 'no-store' }),
    ]);
    const [iData, lData, vData, dData] = await Promise.all([iRes.json(), lRes.json(), vRes.json(), dRes.json()]);
    if (iData.success) setItems(iData.data || []);
    if (lData.success) {
      setLocations(lData.data || []);
      setForm((prev) => ({ ...prev, location_id: prev.location_id || String(lData.data?.[0]?.id || '') }));
    }
    if (vData.success) setVendors(vData.data || []);
    if (dData.success) setDocs(dData.data || []);
  }, [activeKind]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showParty || partyQuery.trim().length < 1) {
      setPartyHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/inventory/parties?type=${form.party_type}&q=${encodeURIComponent(partyQuery)}`);
      const data = await res.json();
      if (data.success) setPartyHits(data.data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [partyQuery, form.party_type, showParty]);

  const save = async (postAfter = false) => {
    const validLines = lines
      .map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
        counted_qty: line.counted_qty === '' ? undefined : Number(line.counted_qty),
      }))
      .filter((line) => line.item_id && (showCounted ? true : line.quantity));
    if (!validLines.length) {
      await alert('Add at least one item', { title: 'Missing items', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: activeKind,
          ...form,
          location_id: form.location_id || null,
          to_location_id: form.to_location_id || null,
          vendor_id: form.vendor_id || null,
          party_id: form.party_id || null,
          lines: validLines,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
        return;
      }
      if (postAfter) {
        const posted = await fetch(`/api/inventory/documents/${data.data.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: postRequiresApprove ? 'approve' : 'post' }),
        });
        const postedData = await posted.json();
        if (!postedData.success) {
          await alert(postedData.error || 'Saved but could not post', { title: 'Error', type: 'error' });
        } else if (activeKind === 'sale' || activeKind === 'issue') {
          try {
            await printInvoice(data.data.id);
          } catch (error) {
            await alert(error instanceof Error ? error.message : 'Sale posted, but the invoice could not be printed.', {
              title: 'Print failed',
              type: 'error',
            });
          }
        }
        if (postRequiresApprove && postedData.success) {
          await fetch(`/api/inventory/documents/${data.data.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'post' }),
          });
        }
      }
      setLines([{ ...EMPTY_LINE }]);
      setForm((prev) => ({ ...prev, remarks: '', party_id: '', party_name: '', vendor_id: '' }));
      setPartyQuery('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: number, action: string) => {
    const res = await fetch(`/api/inventory/documents/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Action failed', { title: 'Error', type: 'error' });
      return;
    }
    load();
  };

  const canPrintInvoice = activeKind === 'sale' || activeKind === 'issue';

  const printInvoice = async (id: number) => {
    try {
      const res = await fetch(`/api/inventory/documents/${id}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid invoice response' }));
      if (!data.success) {
        await alert(data.error || 'Failed to load invoice', { title: 'Error', type: 'error' });
        return;
      }
      printInventoryInvoice(data.data, {
        school_name: settings.school_name,
        school_address: settings.school_address,
        school_phone: settings.school_phone,
        school_email: settings.school_email,
        logo_url: settings.logo_url,
        academic_year: settings.academic_year,
      });
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Failed to print invoice', { title: 'Print failed', type: 'error' });
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          {isSellModal && (
            <button
              type="button"
              onClick={() => setSellOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
            >
              <FiShoppingCart size={14} /> Sell
            </button>
          )}
          {isPurchaseRequestModal && (
            <button
              type="button"
              onClick={() => setPrOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
            >
              <FiFilePlus size={14} /> New request
            </button>
          )}
        </div>
        {allowInOutToggle && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveKind('in')} className={`rounded-lg px-3 py-1.5 text-sm ${activeKind === 'in' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>Stock In</button>
            <button type="button" onClick={() => setActiveKind('out')} className={`rounded-lg px-3 py-1.5 text-sm ${activeKind === 'out' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>Stock Out</button>
          </div>
        )}
        <InventoryModuleLinks />
        {!useModalForm && (
        <form
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Date</span>
              <input type="date" value={form.doc_date} onChange={(e) => setForm((p) => ({ ...p, doc_date: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">{showToLocation ? 'From store' : 'Store'}</span>
              <select value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            {showToLocation && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">To store</span>
                <select value={form.to_location_id} onChange={(e) => setForm((p) => ({ ...p, to_location_id: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">Select</option>
                  {locations.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
            )}
            {showVendor && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Vendor</span>
                <select value={form.vendor_id} onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">Select vendor</option>
                  {vendors.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
            )}
            {showParty && (
              <>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Issue / sell to</span>
                  <select value={form.party_type} onChange={(e) => setForm((p) => ({ ...p, party_type: e.target.value, party_id: '', party_name: '' }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                    {partyTypes.map((type) => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                </label>
                <label className="relative text-sm sm:col-span-2">
                  <span className="mb-1 block text-gray-600">Name</span>
                  <input
                    value={partyQuery || form.party_name}
                    onChange={(e) => {
                      setPartyQuery(e.target.value);
                      setForm((p) => ({ ...p, party_name: e.target.value, party_id: '' }));
                    }}
                    placeholder={`Search ${form.party_type}`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  {partyHits.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border bg-white shadow">
                      {partyHits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setForm((p) => ({ ...p, party_id: String(hit.id), party_name: hit.name }));
                              setPartyQuery('');
                              setPartyHits([]);
                            }}
                          >
                            {hit.name} {hit.code ? <span className="text-gray-400">({hit.code})</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>
              </>
            )}
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-gray-600">Remarks</span>
              <input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 w-28">Qty</th>
                  {showCounted && <th className="py-2 w-28">Counted</th>}
                  {showPrice && <th className="py-2 w-32">Rate</th>}
                  <th className="py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="py-1 pr-2">
                      <select
                        value={line.item_id}
                        onChange={(e) => {
                          const item = items.find((row) => String(row.id) === e.target.value);
                          setLines((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? { ...row, item_id: e.target.value, unit_price: String(item?.unit_price || row.unit_price) }
                                : row
                            )
                          );
                        }}
                        className="w-full rounded-lg border px-2 py-1.5"
                        required
                      >
                        <option value="">Select item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {inventoryItemLabel(item)} {item.item_code ? `(${item.item_code})` : ''} — ₹{Number(item.unit_price || 0).toFixed(0)} — stock {item.quantity ?? 0}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min={showCounted ? undefined : 1} value={line.quantity} onChange={(e) => setLines((prev) => prev.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row)))} className="w-full rounded-lg border px-2 py-1.5" />
                    </td>
                    {showCounted && (
                      <td className="py-1 pr-2">
                        <input type="number" value={line.counted_qty} onChange={(e) => setLines((prev) => prev.map((row, i) => (i === index ? { ...row, counted_qty: e.target.value } : row)))} className="w-full rounded-lg border px-2 py-1.5" />
                      </td>
                    )}
                    {showPrice && (
                      <td className="py-1 pr-2">
                        <input type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => setLines((prev) => prev.map((row, i) => (i === index ? { ...row, unit_price: e.target.value } : row)))} className="w-full rounded-lg border px-2 py-1.5" />
                      </td>
                    )}
                    <td className="py-1">
                      {lines.length > 1 && (
                        <button type="button" className="text-red-600 text-xs" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} className="rounded-lg border px-3 py-2 text-sm">
              Add line
            </button>
            <button type="submit" disabled={saving} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
              Save draft
            </button>
            <button type="button" disabled={saving} onClick={() => save(true)} className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white disabled:opacity-50">
              {postRequiresApprove ? 'Save & approve' : 'Save & post'}
            </button>
          </div>
        </form>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Party / vendor</th>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">No documents yet</td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{doc.doc_no}</td>
                    <td className="px-3 py-2">{String(doc.doc_date).slice(0, 10)}</td>
                    <td className="px-3 py-2">{doc.party_name || doc.vendor_name || '—'}</td>
                    <td className="px-3 py-2">{doc.location_name || '—'}</td>
                    <td className="px-3 py-2 capitalize">{doc.status}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {canPrintInvoice && doc.status !== 'cancelled' && (
                        <button type="button" className="inline-flex items-center gap-1 text-sm text-primary-700" onClick={() => printInvoice(doc.id)}>
                          <FiPrinter size={14} /> Print invoice
                        </button>
                      )}
                      {doc.status !== 'posted' && doc.status !== 'cancelled' && (
                        <>
                          {postRequiresApprove && doc.status !== 'approved' && (
                            <button type="button" className="text-sm text-primary-700" onClick={() => act(doc.id, 'approve')}>Approve</button>
                          )}
                          <button type="button" className="text-sm text-primary-700" onClick={() => act(doc.id, 'post')}>Post</button>
                          <button type="button" className="text-sm text-red-600" onClick={() => act(doc.id, 'cancel')}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isSellModal && (
        <InventorySellModal
          open={sellOpen}
          onClose={() => setSellOpen(false)}
          onSaved={load}
          items={items}
          locations={locations}
          receiptSettings={{
            school_name: settings.school_name,
            school_address: settings.school_address,
            school_phone: settings.school_phone,
            school_email: settings.school_email,
            logo_url: settings.logo_url,
            academic_year: settings.academic_year,
          }}
        />
      )}
      {isPurchaseRequestModal && (
        <InventoryPurchaseRequestModal
          open={prOpen}
          onClose={() => setPrOpen(false)}
          onSaved={load}
          items={items}
          locations={locations}
          vendors={vendors}
        />
      )}
    </DashboardLayout>
  );
}
