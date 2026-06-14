'use client';

import { useState } from 'react';

export default function TestMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/migrate-attendance', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-xl mb-4">Test Attendance Migration</h1>
      
      <button
        onClick={runMigration}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Running Migration...' : 'Run Attendance Migration'}
      </button>

      {result && (
        <div className="mt-4 p-4 border rounded">
          <h2 className="font-bold">Result:</h2>
          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}








