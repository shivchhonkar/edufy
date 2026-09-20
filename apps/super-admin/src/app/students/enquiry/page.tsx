'use client';

import InquiryWorkspace from '@/features/admissions/components/InquiryWorkspace';

export default function EnquiryPage() {
  return (
    <InquiryWorkspace
      title="Enquiry"
      addLabel="Add Enquiry"
      helpText="Capture walk-in, phone, and Android guest enquiries. Modify or delete from the inquiry detail."
      showAndroidFilter
    />
  );
}
