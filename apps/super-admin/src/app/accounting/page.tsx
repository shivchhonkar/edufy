'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiBookOpen } from 'react-icons/fi';

interface Account { id: number; code: string; name: string; account_type: string; }

export default function AccountingPage() {
  const [tab, setTab] = useState<'accounts' | 'journal' | 'ledger'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<Record<string, unknown>[]>([]);
  const [ledger, setLedger] = useState<{ ledger: Record<string, unknown>[]; balance: number } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [entry, setEntry] = useState({ description: '', debit_account: '', credit_account: '', amount: '' });

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/accounting/accounts');
    const data = await res.json();
    if (data.success) setAccounts(data.data);
  }, []);

  const fetchJournal = useCallback(async () => {
    const res = await fetch('/api/accounting/journal');
    const data = await res.json();
    if (data.success) setJournal(data.data);
  }, []);

  useEffect(() => { fetchAccounts(); fetchJournal(); }, [fetchAccounts, fetchJournal]);

  const loadLedger = async (accountId: string) => {
    setSelectedAccount(accountId);
    const res = await fetch(`/api/accounting/journal?account_id=${accountId}`);
    const data = await res.json();
    if (data.success) setLedger(data.data);
    setTab('ledger');
  };

  const postEntry = async () => {
    const amount = parseFloat(entry.amount);
    if (!entry.description || !entry.debit_account || !entry.credit_account || !amount) return;
    const res = await fetch('/api/accounting/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: entry.description,
        lines: [
          { account_id: parseInt(entry.debit_account, 10), debit: amount, credit: 0 },
          { account_id: parseInt(entry.credit_account, 10), debit: 0, credit: amount },
        ],
      }),
    });
    const data = await res.json();
    if (data.success) {
      setEntry({ description: '', debit_account: '', credit_account: '', amount: '' });
      fetchJournal();
      setTab('journal');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0">
        <h1 className="text-xl flex items-center gap-2"><FiBookOpen className="text-primary-600" /> Accounting</h1>
        <div className="flex gap-2">
          {(['accounts', 'journal', 'ledger'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-primary-600 text-white' : 'border'}`}>{t}</button>
          ))}
        </div>

        {tab === 'accounts' && (
          <div className="bg-white border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left p-3">Code</th><th className="text-left p-3">Name</th><th className="text-left p-3">Type</th><th className="p-3">Ledger</th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="p-3 font-mono">{a.code}</td><td className="p-3">{a.name}</td><td className="p-3 capitalize">{a.account_type}</td>
                    <td className="p-3"><button type="button" onClick={() => loadLedger(String(a.id))} className="text-primary-600 text-xs">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'journal' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4 grid gap-3 md:grid-cols-2">
              <input placeholder="Description" value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
              <select value={entry.debit_account} onChange={(e) => setEntry({ ...entry, debit_account: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Debit account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <select value={entry.credit_account} onChange={(e) => setEntry({ ...entry, credit_account: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Credit account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <input type="number" placeholder="Amount" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={postEntry} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm w-fit">Post Entry</button>
            </div>
            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50 border-b"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Description</th><th className="text-right p-3">Debit</th><th className="text-right p-3">Credit</th></tr></thead>
                <tbody>
                  {journal.map((j) => (
                    <tr key={String(j.id)} className="border-b">
                      <td className="p-3">{String(j.entry_date).slice(0, 10)}</td>
                      <td className="p-3">{String(j.description)}</td>
                      <td className="p-3 text-right">₹{parseFloat(String(j.total_debit)).toLocaleString()}</td>
                      <td className="p-3 text-right">₹{parseFloat(String(j.total_credit)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'ledger' && ledger && (
          <div>
            <p className="text-sm text-gray-600 mb-3">Account balance: <strong>₹{ledger.balance.toLocaleString()}</strong></p>
            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50 border-b"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th></tr></thead>
                <tbody>
                  {ledger.ledger.map((l, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3">{String(l.entry_date).slice(0, 10)}</td>
                      <td className="p-3">{String(l.description)}</td>
                      <td className="p-3 text-right">{parseFloat(String(l.debit)) > 0 ? `₹${parseFloat(String(l.debit)).toLocaleString()}` : '—'}</td>
                      <td className="p-3 text-right">{parseFloat(String(l.credit)) > 0 ? `₹${parseFloat(String(l.credit)).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
