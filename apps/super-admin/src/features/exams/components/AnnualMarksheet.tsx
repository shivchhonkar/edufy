'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { CBSE_GRADE_SCALE } from '@/lib/exam-grades';
import {
  DEFAULT_REPORT_SETTINGS,
  type ReportSettings,
} from '@/lib/report-settings';
import { buildMarksheetQrPayload } from '@/lib/marksheet-qr';
import ReportQrCode from '@/features/exams/components/ReportQrCode';

export type MarksheetSubject = {
  subject_name: string;
  half_yearly: { max_marks: number; marks_obtained: number } | null;
  annual: { max_marks: number; marks_obtained: number } | null;
  total_max: number;
  total_obtained: number;
  percentage: number;
  grade: string;
  remarks: string;
};

export type MarksheetData = {
  student: {
    first_name: string;
    last_name: string;
    admission_number: string;
    roll_number?: string | null;
    date_of_birth?: string | null;
    parent_name?: string | null;
    mother_name?: string | null;
    father_name?: string | null;
    class_name: string;
    section_name?: string | null;
    photo_url?: string | null;
  };
  subjects: MarksheetSubject[];
  summary: {
    half_yearly_total: { max: number; obtained: number };
    annual_total: { max: number; obtained: number };
    grand_total: { max: number; obtained: number };
    percentage: number;
    overall_grade: string;
    overall_remarks: string;
    overall_grade_label: string;
    result: string;
  };
};

type AnnualMarksheetProps = {
  data: MarksheetData;
  school: {
    school_name?: string;
    school_address?: string;
    academic_year?: string;
    school_code?: string;
    affiliation_number?: string;
  };
  annualExamName: string;
  halfYearlyExamName?: string | null;
  issueDate?: string;
  reportSettings?: ReportSettings;
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function upperName(first: string, last: string) {
  return `${first} ${last}`.trim().toUpperCase();
}

function CbseLogo({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto" aria-hidden>
      <circle cx="40" cy="40" r="38" fill="#fff" stroke={color} strokeWidth="2" />
      <circle cx="40" cy="40" r="30" fill="#15803d" opacity="0.15" />
      <text x="40" y="36" textAnchor="middle" fontSize="9" fill={color} fontWeight="700">CBSE</text>
      <text x="40" y="48" textAnchor="middle" fontSize="5" fill={color}>INDIA</text>
      <path d="M40 12 L44 22 L54 22 L46 28 L49 38 L40 32 L31 38 L34 28 L26 22 L36 22 Z" fill="#15803d" opacity="0.7" />
    </svg>
  );
}

function DefaultSignature() {
  return (
    <svg viewBox="0 0 120 30" className="w-28 h-8" aria-hidden style={{ color: '#15803d' }}>
      <path d="M5 22 Q20 8 35 18 T65 12 T95 20 T115 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[11px] leading-snug">
      <span className="font-semibold whitespace-nowrap min-w-[118px]">{label}</span>
      <span>:</span>
      <span className="uppercase font-medium flex-1">{value}</span>
    </div>
  );
}

export default function AnnualMarksheet({
  data,
  school,
  annualExamName,
  halfYearlyExamName,
  issueDate,
  reportSettings = DEFAULT_REPORT_SETTINGS,
}: AnnualMarksheetProps) {
  const rs = reportSettings;
  const color = rs.primary_color || '#1e40af';
  const lightBg = `${color}12`;
  const { student, subjects, summary } = data;
  const academicYear = school.academic_year || '';
  const classLabel = student.class_name?.toUpperCase() || '—';
  const boardPrefix = rs.board_name || 'CBSE';
  const serialNo = `${boardPrefix}/${academicYear}/${classLabel.replace(/\s+/g, '')}/${student.admission_number}`;
  const schoolNo = rs.school_code || school.school_code || '12345';
  const affiliationNo = rs.affiliation_number || school.affiliation_number || '2134567';
  const issued = issueDate || formatDate(new Date().toISOString());
  const candidateName = upperName(student.first_name, student.last_name);
  const schoolDisplay = (school.school_name || 'SCHOOL').toUpperCase();
  const isSimple = rs.template === 'simple';

  const qrPayload = useMemo(
    () =>
      buildMarksheetQrPayload({
        serialNo,
        admissionNumber: student.admission_number,
        rollNumber: student.roll_number,
        firstName: student.first_name,
        lastName: student.last_name,
        className: student.class_name,
        sectionName: student.section_name,
        academicYear,
        schoolName: school.school_name || 'School',
        result: summary.result,
        percentage: summary.percentage,
        grade: summary.overall_grade,
        grandTotalObtained: summary.grand_total.obtained,
        grandTotalMax: summary.grand_total.max,
        issuedAt: issued,
      }),
    [serialNo, student, academicYear, school.school_name, summary, issued]
  );

  const examTitle = halfYearlyExamName
    ? `PRIMARY SCHOOL EXAMINATION (${classLabel}) – ANNUAL ${academicYear} MARKS STATEMENT`
    : `MARKS STATEMENT (${classLabel}) – ${academicYear}`;

  const borderStyle = { borderColor: color };
  const thStyle = { backgroundColor: lightBg, borderColor: color, color: '#0f172a' };
  const tdStyle = { borderColor: color };

  const renderHeader = () => {
    if (rs.header_style === 'minimal') {
      return (
        <div className="text-center mb-3">
          <h1 className="text-[15px] font-bold uppercase tracking-wide" style={{ color }}>
            {schoolDisplay}
          </h1>
          <div className="inline-block mt-2 border-2 rounded-lg px-5 py-1.5" style={{ borderColor: color, backgroundColor: lightBg }}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{examTitle}</p>
          </div>
        </div>
      );
    }

    if (rs.header_style === 'school_branded' || rs.template === 'school_branded') {
      return (
        <div className="text-center mb-3">
          {rs.logo_url ? (
            <img src={rs.logo_url} alt="" className="w-16 h-16 mx-auto object-contain mb-2" />
          ) : (
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-lg font-bold mb-2"
              style={{ backgroundColor: color }}
            >
              {(school.school_name || 'S').charAt(0)}
            </div>
          )}
          <h1 className="text-[15px] font-bold uppercase tracking-wide" style={{ color }}>{schoolDisplay}</h1>
          {school.school_address && (
            <p className="text-[9px] text-gray-600 mt-0.5">{school.school_address}</p>
          )}
          <div className="inline-block mt-2 border-2 rounded-lg px-5 py-1.5" style={{ borderColor: color, backgroundColor: lightBg }}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{examTitle}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center mb-3">
        {rs.logo_url ? (
          <img src={rs.logo_url} alt="" className="w-16 h-16 mx-auto object-contain mb-1" />
        ) : (
          <CbseLogo color={color} />
        )}
        {rs.header_hindi && (
          <p className="text-[13px] font-bold mt-1 leading-tight" style={{ color }}>{rs.header_hindi}</p>
        )}
        <h1 className="text-[15px] font-bold tracking-wide uppercase mt-0.5" style={{ color }}>
          {rs.header_english || 'Central Board of Secondary Education'}
        </h1>
        {rs.header_subtitle && (
          <p className="text-[8px] text-gray-600 mt-0.5">{rs.header_subtitle}</p>
        )}
        <div className="inline-block mt-2 border-2 rounded-lg px-5 py-1.5" style={{ borderColor: color, backgroundColor: lightBg }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{examTitle}</p>
        </div>
      </div>
    );
  };

  const showMetaRow = !isSimple && rs.header_style !== 'minimal';

  return (
    <div className="marksheet-page mx-auto max-w-[820px] my-6 print:my-0 break-inside-avoid">
      <div
        className="marksheet-frame relative bg-white p-3 print:p-2"
        style={{ '--marksheet-color': color } as CSSProperties}
      >
        {rs.show_watermark && !isSimple && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="opacity-[0.04] scale-[3]">
              {rs.logo_url ? (
                <img src={rs.logo_url} alt="" className="w-32 h-32 object-contain" />
              ) : (
                <CbseLogo color={color} />
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 px-3 py-4 print:px-2 print:py-3">
          {showMetaRow && (
            <div className="flex justify-between items-start text-[10px] mb-2" style={{ color }}>
              <div>
                <p className="font-semibold">Serial No. : {serialNo.split('/').slice(0, 3).join('/')}/</p>
                <p className="text-red-600 font-bold ml-[52px]">{student.admission_number}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">School No.</span> : {schoolNo}</p>
                <p><span className="font-semibold">Affiliation No.</span> : {affiliationNo}</p>
              </div>
            </div>
          )}

          {renderHeader()}

          <div
            className="flex gap-4 mb-4 border rounded-sm p-3"
            style={{ borderColor: `${color}55`, backgroundColor: lightBg }}
          >
            <div className="flex-1 space-y-1">
              <InfoRow label="Roll No." value={String(student.roll_number || student.admission_number)} />
              <InfoRow label={"Candidate's Name"} value={candidateName} />
              {!isSimple && (
                <>
                  <InfoRow label={"Mother's Name"} value={(student.mother_name || '—').toUpperCase()} />
                  <InfoRow label={"Father's Name"} value={(student.father_name || student.parent_name || '—').toUpperCase()} />
                </>
              )}
              <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth)} />
              <InfoRow label="School" value={schoolDisplay} />
              <InfoRow label="Date of Issue" value={issued} />
            </div>
            {!isSimple && (
              <div className="shrink-0">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt=""
                    className="w-[88px] h-[104px] object-cover border-2 bg-white"
                    style={{ borderColor: color }}
                  />
                ) : (
                  <div
                    className="w-[88px] h-[104px] border-2 flex items-center justify-center text-[9px] text-gray-400"
                    style={{ borderColor: color, backgroundColor: lightBg }}
                  >
                    PHOTO
                  </div>
                )}
              </div>
            )}
          </div>

          <table className="w-full border-collapse border-2 text-[10px] mb-3" style={{ borderColor: color }}>
            <thead>
              <tr>
                {!isSimple && <th rowSpan={2} className="border p-1 text-center font-bold w-12" style={thStyle}>SUBJECT<br />CODE</th>}
                <th rowSpan={2} className="border p-1.5 text-left font-bold min-w-[120px]" style={thStyle}>SUBJECT NAME</th>
                {halfYearlyExamName && (
                  <th colSpan={2} className="border p-1 text-center font-bold" style={{ ...thStyle, backgroundColor: `${color}33` }}>HALF YEARLY</th>
                )}
                <th colSpan={2} className="border p-1 text-center font-bold" style={{ ...thStyle, backgroundColor: `${color}33` }}>ANNUAL</th>
                <th colSpan={3} className="border p-1 text-center font-bold text-white" style={{ ...thStyle, backgroundColor: color }}>TOTAL</th>
                {!isSimple && <th rowSpan={2} className="border p-1 font-bold min-w-[72px]" style={thStyle}>REMARKS</th>}
              </tr>
              <tr>
                {halfYearlyExamName && (
                  <>
                    <th className="border p-1 font-bold" style={thStyle}>MAXIMUM<br />MARKS</th>
                    <th className="border p-1 font-bold" style={thStyle}>MARKS<br />OBTAINED</th>
                  </>
                )}
                <th className="border p-1 font-bold" style={thStyle}>MAXIMUM<br />MARKS</th>
                <th className="border p-1 font-bold" style={thStyle}>MARKS<br />OBTAINED</th>
                <th className="border p-1 font-bold" style={thStyle}>MAXIMUM<br />MARKS</th>
                <th className="border p-1 font-bold" style={thStyle}>MARKS<br />OBTAINED</th>
                <th className="border p-1 font-bold" style={thStyle}>GRADE</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, i) => (
                <tr key={sub.subject_name} style={{ backgroundColor: i % 2 === 0 ? '#fff' : lightBg }}>
                  {!isSimple && <td className="border p-1 text-center" style={tdStyle} />}
                  <td className="border p-1.5 text-left text-[10px] font-medium uppercase" style={tdStyle}>{sub.subject_name}</td>
                  {halfYearlyExamName && (
                    <>
                      <td className="border p-1 text-center" style={tdStyle}>{sub.half_yearly?.max_marks ?? '—'}</td>
                      <td className="border p-1 text-center font-semibold" style={tdStyle}>{sub.half_yearly?.marks_obtained ?? '—'}</td>
                    </>
                  )}
                  <td className="border p-1 text-center" style={tdStyle}>{sub.annual?.max_marks ?? '—'}</td>
                  <td className="border p-1 text-center font-semibold" style={tdStyle}>{sub.annual?.marks_obtained ?? '—'}</td>
                  <td className="border p-1 text-center" style={tdStyle}>{sub.total_max || '—'}</td>
                  <td className="border p-1 text-center font-bold" style={tdStyle}>{sub.total_obtained || '—'}</td>
                  <td className="border p-1 text-center font-bold" style={{ ...tdStyle, color }}>{sub.grade}</td>
                  {!isSimple && <td className="border p-1 text-center text-[9px] uppercase" style={tdStyle}>{sub.remarks}</td>}
                </tr>
              ))}
              <tr className="font-bold" style={{ backgroundColor: `${color}33` }}>
                <td colSpan={isSimple ? 1 : 2} className="border p-1.5 text-right pr-2 uppercase" style={tdStyle}>Grand Total</td>
                {halfYearlyExamName && (
                  <>
                    <td className="border p-1 text-center" style={tdStyle}>{summary.half_yearly_total.max}</td>
                    <td className="border p-1 text-center" style={tdStyle}>{summary.half_yearly_total.obtained}</td>
                  </>
                )}
                <td className="border p-1 text-center" style={tdStyle}>{summary.annual_total.max}</td>
                <td className="border p-1 text-center" style={tdStyle}>{summary.annual_total.obtained}</td>
                <td className="border p-1 text-center" style={tdStyle}>{summary.grand_total.max}</td>
                <td className="border p-1 text-center" style={tdStyle}>{summary.grand_total.obtained}</td>
                <td className="border p-1 text-center" style={{ ...tdStyle, color }}>{summary.overall_grade}</td>
                {!isSimple && <td className="border p-1 text-center text-[9px] uppercase" style={tdStyle}>{summary.overall_remarks}</td>}
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border-2 rounded-sm p-3" style={{ borderColor: color, backgroundColor: lightBg }}>
              <p className="text-[11px] font-bold uppercase">
                Result : <span className={summary.result === 'PASS' ? 'text-green-700' : 'text-red-700'}>{summary.result}</span>
              </p>
              <p className="text-[11px] mt-1.5 uppercase">
                Grade Obtained : <strong>{summary.overall_grade_label}</strong>
              </p>
            </div>
            <div className="border-2 rounded-sm p-3" style={{ borderColor: color, backgroundColor: lightBg }}>
              <p className="text-[11px] uppercase">
                Grand Total (Out of {summary.grand_total.max}) : <strong>{summary.grand_total.obtained}</strong>
              </p>
              <p className="text-[11px] mt-1.5 uppercase">
                Percentage : <strong>{summary.percentage}%</strong>
              </p>
            </div>
          </div>

          {!isSimple && (
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-end mb-4">
              {rs.show_qr_code ? <ReportQrCode payload={qrPayload} color={color} size={72} /> : <div />}
              <div className="text-[8px] text-gray-700 leading-relaxed px-2">
                <p className="font-bold mb-1" style={{ color }}>Note :</p>
                {rs.footer_note ? (
                  <p>{rs.footer_note}</p>
                ) : (
                  <>
                    <p>1. This is a computer-generated marks statement and does not require a physical signature.</p>
                    <p>2. In case of any discrepancy, the school records shall be treated as final.</p>
                    <p>3. Half-yearly and annual marks are combined to derive the total, grade and result shown above.</p>
                  </>
                )}
              </div>
              {rs.show_signature && (
                <div className="text-center min-w-[140px]">
                  <div className="h-10 mb-1 flex items-end justify-center">
                    {rs.counsellor_signature_url ? (
                      <img src={rs.counsellor_signature_url} alt="Signature" className="max-h-10 max-w-[140px] object-contain" />
                    ) : (
                      <DefaultSignature />
                    )}
                  </div>
                  {rs.counsellor_name && (
                    <p className="text-[9px] font-semibold" style={{ color }}>({rs.counsellor_name})</p>
                  )}
                  {rs.counsellor_title && (
                    <p className="text-[8px] uppercase text-gray-600">{rs.counsellor_title}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {rs.show_grading_scale && !isSimple && (
            <div className="border-2 overflow-hidden" style={{ borderColor: color }}>
              <table className="w-full border-collapse text-[8px]">
                <thead>
                  <tr style={{ backgroundColor: lightBg }}>
                    <th className="border p-1 w-24" style={tdStyle} />
                    {CBSE_GRADE_SCALE.map((g) => (
                      <th key={g.grade} className="border p-1 font-bold" style={tdStyle}>{g.grade}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-1 font-bold" style={{ ...tdStyle, backgroundColor: lightBg }}>Percentage Range</td>
                    {CBSE_GRADE_SCALE.map((g) => (
                      <td key={g.grade} className="border p-1 text-center" style={tdStyle}>{g.range}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border p-1 font-bold" style={{ ...tdStyle, backgroundColor: lightBg }}>Remarks</td>
                    {CBSE_GRADE_SCALE.map((g) => (
                      <td key={g.grade} className="border p-1 text-center uppercase" style={tdStyle}>{g.remarks}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[7px] text-gray-400 mt-2 text-center">
            {annualExamName}{halfYearlyExamName ? ` · ${halfYearlyExamName}` : ''}
          </p>
        </div>
      </div>

      <style jsx>{`
        .marksheet-frame {
          border: 6px solid transparent;
          border-image: repeating-linear-gradient(
            45deg,
            var(--marksheet-color, #1e3a8a) 0,
            var(--marksheet-color, #1e3a8a) 4px,
            #3b82f6 4px,
            #3b82f6 8px,
            #93c5fd 8px,
            #93c5fd 12px
          ) 6;
          box-shadow: inset 0 0 0 2px var(--marksheet-color, #1e40af);
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }
        @media print {
          .marksheet-page {
            page-break-after: always;
            max-width: 100%;
          }
          .marksheet-frame {
            border-width: 4px;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
