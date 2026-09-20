'use client';

import { useEffect, useState } from 'react';

export interface AlumniSelectOption {
  id: number;
  student_id: number;
  full_name: string;
  admission_number: string;
  batch_year?: string;
}

interface AlumniSelectFieldProps {
  value: string;
  onChange: (studentId: string) => void;
  required?: boolean;
  className?: string;
}

export default function AlumniSelectField({
  value,
  onChange,
  required = false,
  className = '',
}: AlumniSelectFieldProps) {
  const [options, setOptions] = useState<AlumniSelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alumni?mode=select')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOptions(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className || 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white'}
    >
      <option value="">{loading ? 'Loading alumni…' : 'Select alumni'}</option>
      {options.map((option) => (
        <option key={option.student_id} value={option.student_id}>
          {option.full_name} ({option.admission_number})
          {option.batch_year ? ` · Batch ${option.batch_year}` : ''}
        </option>
      ))}
    </select>
  );
}
