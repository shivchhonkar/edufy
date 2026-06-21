import fs from 'fs';
import path from 'path';

const files = [
  'features/admissions/components/AddInquiryModal.tsx',
  'features/calendar/components/AddCalendarEventModal.tsx',
  'features/visitors/components/RecordVisitorModal.tsx',
  'features/fees/components/ReceiptModal.tsx',
  'features/fees/components/AddFeeStructureModal.tsx',
  'features/attendance/components/RecordStudentAttendanceModal.tsx',
  'features/admissions/components/InquiryDetailModal.tsx',
  'features/students/components/CollectorCameraModal.tsx',
  'features/students/components/BulkEditPrintRangeModal.tsx',
  'features/students/components/TransferCertificateModal.tsx',
  'features/hr/components/LeaveDetailModal.tsx',
  'features/hr/components/LeaveApplyModal.tsx',
];

const ROOT = path.join(process.cwd(), 'src');

function migrate(content, { openProp = 'isOpen', onCloseProp = 'onClose' } = {}) {
  let c = content;
  c = c.replace(/\n\s*const sidebarCollapsed = useMemo\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);\n/g, '\n');
  c = c.replace(/if \(!isOpen\) return null;\s*\n/g, '');
  c = c.replace(/if \(!open\) return null;\s*\n/g, '');

  c = c.replace(
    /<div\s*\n?\s*className=\{`fixed top-0 bottom-0 right-0[^`]*`\}[^>]*>\s*\n?\s*<div className="([^"]*)">/g,
    `<AppModal open={${openProp}} onClose={${onCloseProp}}>\n      <div className="flex flex-col h-full w-full min-h-0 min-w-0 $1">`,
  );

  c = c.replace(
    /<div className="fixed inset-0 z-50 flex items-center justify-center bg-black[^"]*"[^>]*>\s*\n?\s*<div className="([^"]*)">/g,
    `<AppModal open={${openProp}} onClose={${onCloseProp}}>\n      <div className="flex flex-col h-full w-full min-h-0 min-w-0 $1">`,
  );

  c = c.replace(
    /<div\s*\n?\s*className="fixed inset-0 bg-black\/60 flex items-center justify-center p-4"[^>]*>\s*\n?\s*<div className="([^"]*)">/g,
    `<AppModal open={${openProp}} onClose={${onCloseProp}}>\n      <div className="flex flex-col h-full w-full min-h-0 min-w-0 $1">`,
  );

  if (c.includes('<AppModal') && !c.includes("from '@/shared/components/common/AppModal'")) {
    c = c.replace(/^('use client'[^\n]*\n)/m, `$1import AppModal from '@/shared/components/common/AppModal';\n`);
  }

  if (!c.includes('useMemo(')) {
    c = c.replace(/,\s*useMemo/g, '').replace(/useMemo,\s*/g, '');
  }

  // close before final );
  if (c.includes('<AppModal') && !c.includes('</AppModal>')) {
    c = c.replace(/\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*\);/g, '\n      </div>\n    </AppModal>\n  );');
    c = c.replace(/\n\s*<\/div>\s*\n\s*\);(\s*\n\})/g, '\n    </AppModal>\n  );$1');
  }

  return c;
}

for (const rel of files) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const orig = fs.readFileSync(file, 'utf8');
  const openProp = /\bopen\b/.test(orig) && !/\bisOpen\b/.test(orig) ? 'open' : 'isOpen';
  const next = migrate(orig, { openProp });
  if (next !== orig) {
    fs.writeFileSync(file, next);
    console.log('fixed', rel);
  }
}
