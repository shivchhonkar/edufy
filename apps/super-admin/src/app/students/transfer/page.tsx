import { redirect } from 'next/navigation';

export default function CertificateRedirectPage() {
  redirect('/students/certificates');
}
