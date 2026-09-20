'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import { inventoryItemLabel } from '@/features/inventory/item-label';

type Asset = {
  id: number;
  asset_tag: string;
  serial_no?: string;
  status: string;
  item_name?: string;
  size?: string | null;
  location_name?: string;
  assigned_to?: string;
  purchase_value?: number;
};
type Item = { id: number; item_name: string; size?: string | null };
type Location = { id: number; name: string };
type Assignment = { id: number; asset_tag: string; party_name: string; party_type: string; assigned_at: string; returned_at?: string | null };

export default function InventoryAssetsPage() {
  const { alert } = useDialog();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [form, setForm] = useState({ item_id: '', asset_tag: '', serial_no: '', location_id: '', purchase_value: '' });
  const [assign, setAssign] = useState({ asset_id: '', party_type: 'staff', party_name: '' });

  const load = useCallback(async () => {
    const [aRes, iRes, lRes, sRes] = await Promise.all([
      fetch('/api/inventory/assets', { cache: 'no-store' }),
      fetch('/api/inventory/items', { cache: 'no-store' }),
      fetch('/api/inventory/masters/locations'),
      fetch('/api/inventory/assets/assignments', { cache: 'no-store' }),
    ]);
    const [aData, iData, lData, sData] = await Promise.all([aRes.json(), iRes.json(), lRes.json(), sRes.json()]);
    if (aData.success) setAssets(aData.data || []);
    if (iData.success) setItems(iData.data || []);
    if (lData.success) setLocations(lData.data || []);
    if (sData.success) setAssignments(sData.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/inventory/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save asset', { title: 'Error', type: 'error' });
      return;
    }
    setForm({ item_id: '', asset_tag: '', serial_no: '', location_id: '', purchase_value: '' });
    load();
  };

  const saveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/inventory/assets/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assign),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to assign', { title: 'Error', type: 'error' });
      return;
    }
    setAssign({ asset_id: '', party_type: 'staff', party_name: '' });
    load();
  };

  const returnAsset = async (id: number) => {
    await fetch('/api/inventory/assets/assignments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Asset Register</h1>
          <p className="mt-1 text-sm text-gray-500">Track tagged assets and assign them to staff, students or departments.</p>
        </div>
        <InventoryModuleLinks />
        <form onSubmit={saveAsset} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <select value={form.item_id} onChange={(e) => setForm((p) => ({ ...p, item_id: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm sm:col-span-2">
            <option value="">Linked item (optional)</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{inventoryItemLabel(item)}</option>
            ))}
          </select>
          <input required value={form.asset_tag} onChange={(e) => setForm((p) => ({ ...p, asset_tag: e.target.value }))} placeholder="Asset tag" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.serial_no} onChange={(e) => setForm((p) => ({ ...p, serial_no: e.target.value }))} placeholder="Serial no." className="rounded-lg border px-3 py-2 text-sm" />
          <select value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Store</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">Add asset</button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No assets yet</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{asset.asset_tag}</td>
                    <td className="px-3 py-2">{asset.item_name ? inventoryItemLabel(asset) : '—'}</td>
                    <td className="px-3 py-2">{asset.serial_no || '—'}</td>
                    <td className="px-3 py-2">{asset.location_name || '—'}</td>
                    <td className="px-3 py-2 capitalize">{asset.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2">{asset.assigned_to || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2 className="text-base font-medium text-gray-900">Assignments</h2>
        <form onSubmit={saveAssign} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-5">
          <select required value={assign.asset_id} onChange={(e) => setAssign((p) => ({ ...p, asset_id: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>{asset.asset_tag}</option>
            ))}
          </select>
          <select value={assign.party_type} onChange={(e) => setAssign((p) => ({ ...p, party_type: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
            <option value="staff">Staff</option>
            <option value="student">Student</option>
            <option value="department">Department</option>
          </select>
          <input required value={assign.party_name} onChange={(e) => setAssign((p) => ({ ...p, party_name: e.target.value }))} placeholder="Assignee name" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">Assign</button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Assigned to</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">Returned</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.asset_tag}</td>
                  <td className="px-3 py-2">{row.party_name} <span className="text-xs text-gray-400">({row.party_type})</span></td>
                  <td className="px-3 py-2">{String(row.assigned_at).slice(0, 10)}</td>
                  <td className="px-3 py-2">{row.returned_at ? String(row.returned_at).slice(0, 10) : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {!row.returned_at && (
                      <button type="button" className="text-sm text-primary-700" onClick={() => returnAsset(row.id)}>Return</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
