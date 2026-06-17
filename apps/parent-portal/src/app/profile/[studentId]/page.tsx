'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  FiUser,
  FiUsers,
  FiHeart,
  FiFileText,
  FiBook,
  FiDownload,
} from 'react-icons/fi';
import { getAuthHeaders, formatParentDate, studentFullName } from '@/lib/client-auth';

type TabId = 'overview' | 'guardians' | 'medical' | 'documents' | 'history';

interface GuardianRow {
  id: number;
  relation_type: string;
  name: string;
  mobile?: string;
  email?: string;
  occupation?: string;
  is_primary_contact?: boolean;
}

interface DocumentRow {
  id: number;
  document_type: string;
  file_name: string;
  file_path?: string;
  uploaded_at: string;
}

interface EnrollmentRow {
  id: number;
  academic_year: string;
  class_name?: string;
  section_name?: string;
  roll_number?: string;
  status: string;
  is_current?: boolean;
  created_at: string;
  updated_at: string;
}

const TABS: { id: TabId; label: string; icon: typeof FiUser }[] = [
  { id: 'overview', label: 'Overview', icon: FiUser },
  { id: 'guardians', label: 'Guardians', icon: FiUsers },
  { id: 'medical', label: 'Medical', icon: FiHeart },
  { id: 'documents', label: 'Documents', icon: FiFileText },
  { id: 'history', label: 'Academic History', icon: FiBook },
];

const DOC_LABELS: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  aadhaar_card: 'Aadhaar Card',
  transfer_certificate: 'Transfer Certificate',
  migration_certificate: 'Migration Certificate',
  marksheet: 'Marksheet',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
  passport_photo: 'Passport Photo',
  medical_certificate: 'Medical Certificate',
  report_card: 'Report Card',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  promoted: 'Promoted',
  repeated: 'Repeated',
  transferred: 'Transferred',
  left: 'Left',
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;

  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [medical, setMedical] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      if (activeTab === 'overview') {
        const res = await fetch(`/api/students/${studentId}/profile`, { headers });
        const data = await res.json();
        if (data.success) setProfile(data.data);
      }
      if (activeTab === 'guardians') {
        const res = await fetch(`/api/students/${studentId}/guardians`, { headers });
        const data = await res.json();
        if (data.success) setGuardians(data.data);
      }
      if (activeTab === 'medical') {
        const res = await fetch(`/api/students/${studentId}/medical`, { headers });
        const data = await res.json();
        if (data.success) setMedical(data.data);
      }
      if (activeTab === 'documents') {
        const res = await fetch(`/api/students/${studentId}/documents`, { headers });
        const data = await res.json();
        if (data.success) setDocuments(data.data);
      }
      if (activeTab === 'history') {
        const res = await fetch(`/api/students/${studentId}/enrollments`, { headers });
        const data = await res.json();
        if (data.success) setEnrollments(data.data);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, studentId]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    fetchTabData();
  }, [fetchTabData, router]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && TABS.some((t) => t.id === tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/profile/${studentId}?tab=${tab}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl text-gray-900">Student Profile</h1>
        {profile && (
          <p className="text-gray-600 mt-1">
            {studentFullName(profile as { first_name: string; middle_name?: string; last_name: string })}
            {' · '}
            {(profile.admission_number as string) || ''}
          </p>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="border-b overflow-x-auto">
          <nav className="flex min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {activeTab === 'overview' && profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoBlock title="Personal">
                    <InfoRow label="Full name" value={studentFullName(profile as never)} />
                    <InfoRow label="Admission no." value={profile.admission_number as string} />
                    <InfoRow label="Student code" value={profile.student_code as string} />
                    <InfoRow label="Gender" value={profile.gender as string} />
                    <InfoRow label="Date of birth" value={formatParentDate(profile.date_of_birth as string)} />
                    <InfoRow label="Blood group" value={profile.blood_group as string} />
                  </InfoBlock>
                  <InfoBlock title="Academic">
                    <InfoRow label="Class" value={profile.class_name as string} />
                    <InfoRow label="Section" value={profile.section_name as string} />
                    <InfoRow label="Roll no." value={profile.roll_number as string} />
                    <InfoRow label="Academic year" value={profile.current_academic_year as string} />
                    <InfoRow label="Category" value={profile.category as string} />
                    <InfoRow label="Mother tongue" value={profile.mother_tongue as string} />
                  </InfoBlock>
                  <InfoBlock title="Address" className="md:col-span-2">
                    <InfoRow
                      label="Address"
                      value={[profile.address, profile.city, profile.state, profile.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  </InfoBlock>
                </div>
              )}

              {activeTab === 'guardians' && (
                <div className="space-y-3">
                  {guardians.length === 0 ? (
                    <EmptyState text="No guardian records found." />
                  ) : (
                    guardians.map((g) => (
                      <div key={g.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold capitalize">{g.relation_type}</span>
                          {g.is_primary_contact && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900">{g.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {g.mobile || '—'}
                          {g.email ? ` · ${g.email}` : ''}
                        </p>
                        {g.occupation && (
                          <p className="text-sm text-gray-500 mt-1">{g.occupation}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'medical' && (
                medical ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Blood group" value={medical.blood_group as string} />
                    <InfoRow label="Allergies" value={medical.allergies as string} />
                    <InfoRow label="Chronic condition" value={medical.chronic_disease as string} />
                    <InfoRow label="Disability" value={medical.disability as string} />
                    <InfoRow label="Doctor" value={medical.doctor_name as string} />
                    <InfoRow label="Doctor contact" value={medical.doctor_contact as string} />
                    <InfoRow label="Emergency contact" value={medical.emergency_contact as string} />
                    <InfoRow label="Notes" value={medical.medical_notes as string} className="md:col-span-2" />
                  </div>
                ) : (
                  <EmptyState text="No medical record on file." />
                )
              )}

              {activeTab === 'documents' && (
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <EmptyState text="No documents uploaded yet." />
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between border rounded-lg p-4"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {DOC_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-sm text-gray-600">{doc.file_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded {formatParentDate(doc.uploaded_at)}
                          </p>
                        </div>
                        {doc.file_path && (
                          <a
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                          >
                            <FiDownload />
                            Download
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {enrollments.length === 0 ? (
                    <EmptyState text="No academic history recorded yet." />
                  ) : (
                    enrollments.map((e) => (
                      <div
                        key={e.id}
                        className={`border rounded-lg p-4 ${
                          e.is_current ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{e.academic_year}</span>
                          {e.is_current && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">
                            {STATUS_LABELS[e.status] || e.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                          {e.class_name || '—'}
                          {e.section_name ? ` · Section ${e.section_name}` : ''}
                          {e.roll_number ? ` · Roll ${e.roll_number}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {e.is_current
                            ? `Since ${formatParentDate(e.created_at)}`
                            : `${formatParentDate(e.created_at)} – ${formatParentDate(e.updated_at)}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value || 'N/A'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-12 text-gray-500 text-sm">{text}</div>;
}
