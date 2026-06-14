'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseMarksheetQrQuery } from '@/lib/marksheet-qr';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

type VerifyResponse = {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
  school?: { name: string; academic_year: string };
  student?: {
    name: string;
    admission_number: string;
    roll_number: string | null;
    class_name: string;
    section_name: string | null;
    status: string;
  };
  serial_no?: string;
  latest_exam?: {
    exam_name: string;
    exam_type: string;
    total_obtained: number;
    total_max: number;
    percentage: number;
  };
};

function VerifyContent() {
  const searchParams = useSearchParams();
  const { admission_number, serial_no, academic_year } = parseMarksheetQrQuery(searchParams);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admission_number || !serial_no) {
      setData({ success: false, error: 'Invalid QR code — missing verification parameters.' });
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({ adm: admission_number, serial: serial_no });
    if (academic_year) params.set('ay', academic_year);

    fetch(`/api/marksheets/verify?${params.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ success: false, error: 'Verification request failed.' }))
      .finally(() => setLoading(false));
  }, [admission_number, serial_no, academic_year]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
        <FiLoader className="animate-spin text-3xl" />
        <p>Verifying marksheet record...</p>
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <FiXCircle className="mx-auto text-red-600 text-4xl mb-3" />
        <h1 className="font-semibold text-red-900">Verification Failed</h1>
        <p className="text-sm text-red-700 mt-2">{data?.error || 'Unable to verify this record.'}</p>
      </div>
    );
  }

  if (!data.verified) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
        <FiXCircle className="mx-auto text-amber-600 text-4xl mb-3" />
        <h1 className="font-semibold text-amber-900">Record Not Verified</h1>
        <p className="text-sm text-amber-800 mt-2">{data.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white border rounded-xl shadow-sm">
      <div className="text-center mb-6">
        <FiCheckCircle className="mx-auto text-green-600 text-5xl mb-3" />
        <h1 className="text-xl font-bold text-gray-900">Marksheet Verified</h1>
        <p className="text-sm text-gray-500 mt-1">{data.message}</p>
      </div>

      <div className="space-y-3 text-sm border-t pt-4">
        <p><span className="text-gray-500">School:</span> <strong>{data.school?.name}</strong></p>
        <p><span className="text-gray-500">Academic Year:</span> <strong>{data.school?.academic_year || academic_year}</strong></p>
        <p><span className="text-gray-500">Student:</span> <strong>{data.student?.name}</strong></p>
        <p><span className="text-gray-500">Admission No:</span> <strong>{data.student?.admission_number}</strong></p>
        {data.student?.roll_number && (
          <p><span className="text-gray-500">Roll No:</span> <strong>{data.student.roll_number}</strong></p>
        )}
        <p>
          <span className="text-gray-500">Class:</span>{' '}
          <strong>
            {data.student?.class_name}
            {data.student?.section_name ? ` - ${data.student.section_name}` : ''}
          </strong>
        </p>
        <p><span className="text-gray-500">Serial No:</span> <strong className="text-xs break-all">{data.serial_no}</strong></p>
        {data.latest_exam && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="font-medium text-blue-900">Latest Exam: {data.latest_exam.exam_name}</p>
            <p className="text-blue-800 mt-1">
              Marks: {data.latest_exam.total_obtained} / {data.latest_exam.total_max} ({data.latest_exam.percentage}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyMarksheetPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-12">
      <header className="bg-white border-b py-4 mb-6">
        <p className="text-center text-sm font-semibold text-primary-700">Marksheet Verification</p>
      </header>
      <Suspense fallback={<p className="text-center text-gray-500 py-16">Loading...</p>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
