'use client';

import type { ComponentType, ReactNode } from 'react';
import { FiUser, FiPhone, FiMail, FiMapPin, FiBook, FiCalendar, FiHash } from 'react-icons/fi';
import { Student } from '@/shared/types';
import { formatStudentDate } from '@/features/students/utils/student-profile';

interface ProfileTabProps {
  student: Student & { class_name?: string; section_name?: string };
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="py-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4 text-primary-600" />}
        <p className="text-sm text-gray-900">{value ?? 'N/A'}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          {Icon && <Icon className="mr-2 w-4 h-4" />}
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function ProfileTab({ student }: ProfileTabProps) {
  return (
    <div className="space-y-4">
      <Section title="Personal Information" icon={FiUser}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="Student Code" value={student.student_code} icon={FiHash} />
          <InfoRow label="Date of Birth" value={formatStudentDate(student.date_of_birth)} icon={FiCalendar} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Blood Group" value={student.blood_group} />
          <InfoRow label="Aadhaar No." value={student.aadhaar_no} />
          <InfoRow label="Admission Date" value={formatStudentDate(student.admission_date)} icon={FiCalendar} />
          <InfoRow label="Religion" value={student.religion} />
          <InfoRow label="Caste" value={student.caste} />
          <InfoRow label="Category" value={student.category} />
          <InfoRow label="Nationality" value={student.nationality} />
          <InfoRow label="Mother Tongue" value={student.mother_tongue} />
        </div>
        {student.remarks && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <InfoRow label="Remarks" value={student.remarks} />
          </div>
        )}
      </Section>

      <Section title="Address Information" icon={FiMapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Street Address" value={student.address} />
          <InfoRow label="City" value={student.city} />
          <InfoRow label="State" value={student.state} />
          <InfoRow label="Pincode" value={student.pincode} />
        </div>
      </Section>

      <Section title="Current Academic" icon={FiBook}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="Class" value={student.class_name} />
          <InfoRow label="Section" value={student.section_name} />
          <InfoRow label="Roll Number" value={student.roll_number} icon={FiHash} />
        </div>
      </Section>

      <Section title="Legacy Parent Contact" icon={FiUser}>
        <p className="text-xs text-gray-500 mb-3">
          Manage detailed guardian records in the Guardians tab.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="Parent Name" value={student.parent_name} />
          <InfoRow label="Parent Phone" value={student.parent_phone} icon={FiPhone} />
          <InfoRow label="Parent Email" value={student.parent_email} icon={FiMail} />
          <InfoRow label="Emergency Contact" value={student.emergency_contact} icon={FiPhone} />
        </div>
      </Section>
    </div>
  );
}
