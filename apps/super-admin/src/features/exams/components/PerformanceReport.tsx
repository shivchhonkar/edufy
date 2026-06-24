'use client';

import type { CSSProperties } from 'react';
import { CBSE_GRADE_SCALE } from '@/lib/exam-grades';
import { DEFAULT_REPORT_SETTINGS, type ReportSettings } from '@/lib/report-settings';
import type { PerformanceReportData } from '@/services/exams/performance-report-builder';
import DocumentWatermark from '@/shared/components/documents/DocumentWatermark';

type SchoolInfo = {
  school_name?: string;
  school_address?: string;
  academic_year?: string;
  affiliation_number?: string;
};

type PerformanceReportProps = {
  data: PerformanceReportData;
  school: SchoolInfo;
  reportSettings?: ReportSettings;
  classTeacherRemark?: string;
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function CbseLogo() {
  return (
    <svg viewBox="0 0 80 80" className="w-14 h-14" aria-hidden>
      <circle cx="40" cy="40" r="38" fill="#fff" stroke="#15803d" strokeWidth="2" />
      <circle cx="40" cy="40" r="30" fill="#15803d" opacity="0.15" />
      <text x="40" y="36" textAnchor="middle" fontSize="9" fill="#15803d" fontWeight="700">CBSE</text>
      <text x="40" y="48" textAnchor="middle" fontSize="5" fill="#15803d">INDIA</text>
    </svg>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[10px] leading-tight">
      <span className="font-bold uppercase whitespace-nowrap">{label}</span>
      <span>:</span>
      <span className="uppercase font-semibold flex-1">{value || '—'}</span>
    </div>
  );
}

const cellCls = 'border border-black px-1 py-0.5 text-center text-[9px]';
const thCls = 'border border-black px-1 py-1 text-center text-[8px] font-bold uppercase bg-gray-100';

export default function PerformanceReport({
  data,
  school,
  reportSettings = DEFAULT_REPORT_SETTINGS,
  classTeacherRemark,
}: PerformanceReportProps) {
  const rs = reportSettings;
  const color = rs.primary_color || '#1e3a8a';
  const { student, subjects, summary, report_type, report_title } = data;
  const academicYear = school.academic_year || '';
  const schoolName = (school.school_name || 'School').toUpperCase();
  const affiliation = rs.affiliation_number || school.affiliation_number || '';
  const candidateName = `${student.first_name} ${student.last_name}`.trim().toUpperCase();

  const renderTermTable = () => (
    <table className="w-full border-collapse border border-black text-[9px]">
      <thead>
        <tr>
          <th className={thCls} rowSpan={2}>SUBJECTS</th>
          <th className={thCls} colSpan={4}>{data.term_label || 'TERM EXAM'}</th>
          <th className={thCls} rowSpan={2}>GRADE</th>
        </tr>
        <tr>
          <th className={thCls}>SA MARKS<br />(30)</th>
          <th className={thCls}>SA WEIGHTAGE<br />(10)</th>
          <th className={thCls}>FA WEIGHTAGE<br />(10)</th>
          <th className={thCls}>TOTAL<br />(20)</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((s) => (
          <tr key={s.subject_id}>
            <td className={`${cellCls} text-left font-semibold uppercase`}>{s.subject_name}</td>
            <td className={cellCls}>{fmt(s.sa_marks)}</td>
            <td className={cellCls}>{fmt(s.sa_weightage)}</td>
            <td className={cellCls}>{fmt(s.fa_weightage)}</td>
            <td className={cellCls}>{fmt(s.term_total)}</td>
            <td className={`${cellCls} font-bold`}>{s.grade}</td>
          </tr>
        ))}
        <tr className="font-bold">
          <td className={`${cellCls} text-left uppercase`} colSpan={4}>GRAND TOTAL</td>
          <td className={cellCls}>{fmt(summary.grand_total)}</td>
          <td className={cellCls}>{summary.overall_grade}</td>
        </tr>
        <tr>
          <td className={`${cellCls} text-left font-bold uppercase`} colSpan={5}>PERCENTAGE</td>
          <td className={cellCls}>{summary.percentage}%</td>
        </tr>
      </tbody>
    </table>
  );

  const renderHalfYearlyTable = () => (
    <table className="w-full border-collapse border border-black text-[9px]">
      <thead>
        <tr>
          <th className={thCls} rowSpan={2}>SUBJECTS</th>
          <th className={thCls} rowSpan={2}>UT-1<br />(20)</th>
          <th className={thCls} colSpan={4}>HALF YEARLY</th>
          <th className={thCls} rowSpan={2}>GRAND TOTAL<br />UT-I+HY (50)</th>
          <th className={thCls} rowSpan={2}>GRADE</th>
        </tr>
        <tr>
          <th className={thCls}>SA MARKS<br />(60)</th>
          <th className={thCls}>SA WEIGHTAGE<br />(20)</th>
          <th className={thCls}>FA WEIGHTAGE<br />(10)</th>
          <th className={thCls}>HY TOTAL<br />(30)</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((s) => (
          <tr key={s.subject_id}>
            <td className={`${cellCls} text-left font-semibold uppercase`}>{s.subject_name}</td>
            <td className={cellCls}>{fmt(s.ut1)}</td>
            <td className={cellCls}>{fmt(s.hy_sa_marks)}</td>
            <td className={cellCls}>{fmt(s.hy_sa_weightage)}</td>
            <td className={cellCls}>{fmt(s.hy_fa_weightage)}</td>
            <td className={cellCls}>{fmt(s.hy_total)}</td>
            <td className={cellCls}>{fmt(s.half_grand_total)}</td>
            <td className={`${cellCls} font-bold`}>{s.grade}</td>
          </tr>
        ))}
        <tr className="font-bold">
          <td className={`${cellCls} text-left uppercase`} colSpan={6}>GRAND TOTAL</td>
          <td className={cellCls}>{fmt(summary.grand_total)}</td>
          <td className={cellCls}>{summary.overall_grade}</td>
        </tr>
        <tr>
          <td className={`${cellCls} text-left font-bold uppercase`} colSpan={7}>PERCENTAGE</td>
          <td className={cellCls}>{summary.percentage}%</td>
        </tr>
      </tbody>
    </table>
  );

  const renderAnnualTable = () => (
    <table className="w-full border-collapse border border-black text-[8px]">
      <thead>
        <tr>
          <th className={thCls} rowSpan={3}>SUBJECTS</th>
          <th className={thCls} colSpan={7}>TERM-1</th>
          <th className={thCls} colSpan={7}>TERM-2</th>
          <th className={thCls} rowSpan={3}>GRAND TOTAL<br />(100)</th>
          <th className={thCls} rowSpan={3}>GRADE</th>
        </tr>
        <tr>
          <th className={thCls} colSpan={3}>UT-1</th>
          <th className={thCls} colSpan={3}>HALF YEARLY</th>
          <th className={thCls} rowSpan={2}>TOTAL<br />(50)</th>
          <th className={thCls} colSpan={3}>UT-2</th>
          <th className={thCls} colSpan={3}>ANNUAL</th>
          <th className={thCls} rowSpan={2}>TOTAL<br />(50)</th>
        </tr>
        <tr>
          <th className={thCls}>FA (5)</th>
          <th className={thCls}>SA (15)</th>
          <th className={thCls}>T (20)</th>
          <th className={thCls}>FA (5)</th>
          <th className={thCls}>SA (25)</th>
          <th className={thCls}>T (30)</th>
          <th className={thCls}>FA (5)</th>
          <th className={thCls}>SA (15)</th>
          <th className={thCls}>T (20)</th>
          <th className={thCls}>FA (5)</th>
          <th className={thCls}>SA (25)</th>
          <th className={thCls}>T (30)</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((s) => (
          <tr key={s.subject_id}>
            <td className={`${cellCls} text-left font-semibold uppercase`}>{s.subject_name}</td>
            <td className={cellCls}>{fmt(s.term1_ut_fa)}</td>
            <td className={cellCls}>{fmt(s.term1_ut_sa)}</td>
            <td className={cellCls}>{fmt((s.term1_ut_fa ?? 0) + (s.term1_ut_sa ?? 0) || null)}</td>
            <td className={cellCls}>{fmt(s.term1_hy_fa)}</td>
            <td className={cellCls}>{fmt(s.term1_hy_sa)}</td>
            <td className={cellCls}>{fmt((s.term1_hy_fa ?? 0) + (s.term1_hy_sa ?? 0) || null)}</td>
            <td className={cellCls}>{fmt(s.term1_total)}</td>
            <td className={cellCls}>{fmt(s.term2_ut_fa)}</td>
            <td className={cellCls}>{fmt(s.term2_ut_sa)}</td>
            <td className={cellCls}>{fmt((s.term2_ut_fa ?? 0) + (s.term2_ut_sa ?? 0) || null)}</td>
            <td className={cellCls}>{fmt(s.term2_annual_fa)}</td>
            <td className={cellCls}>{fmt(s.term2_annual_sa)}</td>
            <td className={cellCls}>{fmt((s.term2_annual_fa ?? 0) + (s.term2_annual_sa ?? 0) || null)}</td>
            <td className={cellCls}>{fmt(s.term2_total)}</td>
            <td className={cellCls}>{fmt(s.grand_total)}</td>
            <td className={`${cellCls} font-bold`}>{s.grade}</td>
          </tr>
        ))}
        <tr className="font-bold">
          <td className={`${cellCls} text-left uppercase`} colSpan={15}>GRAND TOTAL</td>
          <td className={cellCls}>{fmt(summary.grand_total)}</td>
          <td className={cellCls}>{summary.overall_grade}</td>
        </tr>
        <tr>
          <td className={`${cellCls} text-left font-bold uppercase`} colSpan={15}>PERCENTAGE</td>
          <td className={cellCls} colSpan={2}>{summary.percentage}%</td>
        </tr>
      </tbody>
    </table>
  );

  const gradingNote = CBSE_GRADE_SCALE.map((g) => `${g.range.replace(/\s+/g, '')}=${g.grade}`).join(', ');

  return (
    <div className="marksheet-page mx-auto max-w-[820px] my-6 print:my-0 break-inside-avoid">
      <div
        className="relative bg-white p-4 print:p-2 border border-gray-300"
        style={{ '--report-color': color } as CSSProperties}
      >
        {rs.show_watermark && (
          <DocumentWatermark
            show
            imageUrl={rs.watermark_url}
            text={rs.watermark_text}
            schoolName={schoolName}
            color={color}
            variant="tile"
          />
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="w-16 shrink-0">
              {rs.logo_url ? (
                <img src={rs.logo_url} alt="" className="w-14 h-14 object-contain" />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: color }}
                >
                  {schoolName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 text-center px-2">
              <h1 className="text-sm font-bold uppercase leading-tight" style={{ color }}>
                {schoolName}
              </h1>
              {school.school_address && (
                <p className="text-[8px] text-gray-700 mt-0.5">{school.school_address}</p>
              )}
              {affiliation && (
                <p className="text-[7px] text-gray-600 mt-0.5">
                  (Affiliated to C.B.S.E., Delhi, Affiliation No. {affiliation})
                </p>
              )}
              <p className="text-[11px] font-bold uppercase mt-2 tracking-wide">{report_title}</p>
              {report_type === 'half_yearly' && (
                <p className="text-[10px] font-semibold uppercase mt-0.5">FIRST TERM PERFORMANCE</p>
              )}
              {academicYear && <p className="text-[10px] font-semibold mt-1">{academicYear}</p>}
            </div>
            <div className="w-16 shrink-0 flex justify-end">
              <CbseLogo />
            </div>
          </div>

          {/* Student info */}
          <div className="flex gap-3 border border-black p-2 mb-3">
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoField label="Name of Student" value={candidateName} />
              <InfoField label="Admission No." value={student.admission_number} />
              <InfoField label="Father's Name" value={(student.father_name || student.parent_name || '').toUpperCase()} />
              <InfoField label="Roll No." value={String(student.roll_number || '—')} />
              <InfoField label="Mother's Name" value={(student.mother_name || '').toUpperCase()} />
              <InfoField label="Class" value={student.class_name?.toUpperCase() || '—'} />
              <InfoField label="DOB" value={formatDate(student.date_of_birth)} />
              <InfoField label="Section" value={(student.section_name || '—').toUpperCase()} />
            </div>
            <div className="w-20 h-24 shrink-0 border border-black flex items-center justify-center bg-gray-50 overflow-hidden">
              {student.photo_url ? (
                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] text-gray-400 text-center px-1">PHOTO</span>
              )}
            </div>
          </div>

          {/* Marks table */}
          {report_type === 'term' && renderTermTable()}
          {report_type === 'half_yearly' && renderHalfYearlyTable()}
          {report_type === 'annual' && renderAnnualTable()}

          {/* Grading scale & formulas */}
          {rs.show_grading_scale && (
            <div className="mt-2 border border-black p-2 text-[7px] leading-snug">
              <p className="font-bold uppercase mb-1">Scholastic Areas (8 Point Grading Scale)</p>
              <p>{gradingNote}, 32% & BELOW=E (NEED IMPROVEMENTS)</p>
              {report_type === 'term' && (
                <p className="mt-1">* SA WEIGHTAGE = SA MARKS/3=10 | * FA WEIGHTAGE = (FA1+FA2+FA3)/3=10 OR (FA1+FA2)/3=10</p>
              )}
              {report_type === 'half_yearly' && (
                <p className="mt-1">* SA Weightage=SA Marks/3=20 | * FA Weightage=(FA3+FA4)/3=10</p>
              )}
            </div>
          )}

          {classTeacherRemark && (
            <div className="mt-2 border border-black p-2 text-[9px]">
              <span className="font-bold uppercase">Class Teacher&apos;s Remark: </span>
              {classTeacherRemark}
            </div>
          )}

          {/* Signatures */}
          {rs.show_signature && (
            <div className="flex justify-between items-end mt-8 px-4 text-[9px] font-bold uppercase">
              <div className="text-center">
                <div className="h-8 mb-1" />
                <div className="border-t border-black pt-1 min-w-[120px]">Class Teacher</div>
              </div>
              <div className="text-center">
                <div className="h-8 mb-1" />
                <div className="border-t border-black pt-1 min-w-[120px]">Principal</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
