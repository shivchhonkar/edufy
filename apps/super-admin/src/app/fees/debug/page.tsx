'use client';

import { useEffect, useState } from 'react';

interface FeeStructure {
  id: number;
  class_id: number;
  class_name: string;
  fee_type: string;
  amount: string;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function FeeStructuresDebugPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const fetchFeeStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/fees/structures?academic_year=2025-26');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setFeeStructures(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch fee structures');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error fetching fee structures:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStructures = feeStructures.filter(fs => {
    if (filter === 'all') return true;
    if (filter === 'active') return fs.is_active;
    if (filter === 'inactive') return !fs.is_active;
    if (filter === 'class7') return fs.class_name === 'Class 7';
    return true;
  });

  const groupedByClass = filteredStructures.reduce((acc, fs) => {
    if (!acc[fs.class_name]) {
      acc[fs.class_name] = [];
    }
    acc[fs.class_name].push(fs);
    return acc;
  }, {} as Record<string, FeeStructure[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fee structures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h2 className="text-red-800 font-bold text-xl mb-2">Error Loading Data</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchFeeStructures}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl text-gray-900 mb-2">Fee Structures Debug Page</h1>
          <p className="text-gray-600">Academic Year: 2025-26 | Total Records: {feeStructures.length}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({feeStructures.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'active' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({feeStructures.filter(f => f.is_active).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'inactive' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive ({feeStructures.filter(f => !f.is_active).length})
            </button>
            <button
              onClick={() => setFilter('class7')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'class7' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class 7 Only ({feeStructures.filter(f => f.class_name === 'Class 7').length})
            </button>
          </div>
        </div>

        {/* Grouped by Class */}
        <div className="space-y-6">
          {Object.entries(groupedByClass).map(([className, structures]) => (
            <div key={className} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h2 className="text-xl text-gray-900">{className}</h2>
                <p className="text-sm text-gray-600">{structures.length} fee structure(s)</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {structures.map((fs) => (
                      <tr key={fs.id} className={!fs.is_active ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">{fs.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{fs.fee_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{parseFloat(fs.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            fs.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {fs.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(fs.created_at).toLocaleString('en-IN', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(fs.updated_at).toLocaleString('en-IN', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {filteredStructures.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No fee structures found matching the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}



























































