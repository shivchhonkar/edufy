'use client';

import React, { useState, useEffect } from 'react';
import { FiDownload, FiTrendingUp, FiBarChart, FiDollarSign } from 'react-icons/fi';
import { Button } from '@EduLakhya/ui';
import { formatCurrency, formatDate } from '@EduLakhya/utils';
import Link from 'next/link';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalIssues: 0,
    netValue: 0,
  });
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [filterType]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const calculateStats = (txns: any[]) => {
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
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'Type', 'Quantity', 'Amount', 'Created By', 'Remarks'];
    const rows = transactions.map((t) => [
      formatDate(new Date(t.transaction_date)),
      t.item_name,
      t.transaction_type,
      t.quantity,
      t.total_amount || 0,
      t.created_by_name || '',
      t.remarks || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-600">Inventory reports and insights</p>
            </div>
            <div className="flex gap-2">
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
              <h3 className="text-sm font-medium text-gray-500">Net Value</h3>
              <FiDollarSign className={stats.netValue >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
            </div>
            <p className={`text-xl ${stats.netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(stats.netValue))}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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


























































