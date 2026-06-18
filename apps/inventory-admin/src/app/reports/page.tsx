'use client';

import React, { useState, useEffect } from 'react';
import { FiDownload, FiTrendingUp, FiBarChart, FiDollarSign } from 'react-icons/fi';
import { Button } from '@edulakhya/ui';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import Link from 'next/link';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalIssues: 0,
    netValue: 0,
    totalInvoices: 0,
  });
  const [filterType, setFilterType] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterType, invoiceStatus, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      const txnParams = new URLSearchParams();
      if (filterType) txnParams.append('type', filterType);
      if (dateFrom) txnParams.append('from', dateFrom);
      if (dateTo) txnParams.append('to', dateTo);

      const invoiceParams = new URLSearchParams();
      if (invoiceStatus) invoiceParams.append('status', invoiceStatus);
      if (dateFrom) invoiceParams.append('from', dateFrom);
      if (dateTo) invoiceParams.append('to', dateTo);

      const [txnRes, invoiceRes] = await Promise.all([
        fetch(`/api/transactions?${txnParams}`),
        fetch(`/api/sales?${invoiceParams}`),
      ]);

      const txnData = await txnRes.json();
      const invoiceData = await invoiceRes.json();

      if (txnData.success) {
        setTransactions(txnData.data);
        calculateStats(txnData.data, invoiceData.success ? invoiceData.data : []);
      }
      if (invoiceData.success) {
        setInvoices(invoiceData.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const calculateStats = (txns: any[], invoiceRows: any[]) => {
    const sales = txns
      .filter((t) => t.transaction_type === 'issue' && t.total_amount)
      .reduce((sum, t) => sum + parseFloat(t.total_amount), 0);

    const purchases = txns
      .filter((t) => t.transaction_type === 'purchase' && t.total_amount)
      .reduce((sum, t) => sum + parseFloat(t.total_amount), 0);

    const issues = txns.filter((t) => t.transaction_type === 'issue').length;

    setStats({
      totalSales: sales,
      totalPurchases: purchases,
      totalIssues: issues,
      netValue: sales - purchases,
      totalInvoices: invoiceRows.length,
    });
  };

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Student', 'Total Amount', 'Payment Status', 'Items'];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      formatDate(new Date(inv.created_at)),
      `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || inv.admission_number || 'N/A',
      inv.total_amount || 0,
      inv.payment_status,
      inv.total_items || 0,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-600">Inventory reports and insights</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Button onClick={exportToCSV}>
                <FiDownload className="mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
              <FiDollarSign className="text-green-600" size={24} />
            </div>
            <p className="text-xl text-gray-900">{formatCurrency(stats.totalSales)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Purchases</h3>
              <FiTrendingUp className="text-blue-600" size={24} />
            </div>
            <p className="text-xl text-gray-900">{formatCurrency(stats.totalPurchases)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Items Issued</h3>
              <FiBarChart className="text-purple-600" size={24} />
            </div>
            <p className="text-xl text-gray-900">{stats.totalIssues}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
              <FiDollarSign className={stats.netValue >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
            </div>
            <p className="text-xl text-gray-900">{stats.totalInvoices}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Transaction Types</option>
              <option value="purchase">Purchases</option>
              <option value="issue">Sales/Issues</option>
              <option value="return">Returns</option>
              <option value="damage">Damages</option>
            </select>
            <select
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Invoice Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="due">Due</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="From Date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="To Date"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setFilterType('');
              setInvoiceStatus('');
              setDateFrom('');
              setDateTo('');
            }}>
              Reset Filters
            </Button>
            <Link href="/sales">
              <Button>Create Sell Invoice</Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">Sell Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-center text-gray-500" colSpan={6}>
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">
                        <Link
                          href={`/sales/${inv.id}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {`${inv.first_name || ''} ${inv.last_name || ''}`.trim() || 'N/A'}
                        <div className="text-xs text-gray-500">{inv.admission_number || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(new Date(inv.created_at))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{inv.total_items}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="rounded-full bg-slate-100 px-2 py-1 capitalize text-slate-700">
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(Number(inv.total_amount || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Summary by Item */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">Transaction Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const itemSummary: any = {};
                  transactions.forEach((t) => {
                    if (!itemSummary[t.item_id]) {
                      itemSummary[t.item_id] = {
                        item_name: t.item_name,
                        item_code: t.item_code,
                        count: 0,
                        quantity: 0,
                        amount: 0,
                      };
                    }
                    itemSummary[t.item_id].count++;
                    itemSummary[t.item_id].quantity += t.quantity;
                    itemSummary[t.item_id].amount += t.total_amount || 0;
                  });

                  return Object.values(itemSummary).map((item: any, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        <div className="text-xs text-gray-500">{item.item_code}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.count}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ));
                })()}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


























































