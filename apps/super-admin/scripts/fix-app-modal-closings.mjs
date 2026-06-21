import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const ROOT = path.join(process.cwd(), 'src');
const SKIP = new Set(['ContentAreaModal.tsx', 'AppModal.tsx', 'ConfirmDialog.tsx', 'AlertDialog.tsx']);

const SIDEBAR_BLOCK = /\n\s*const sidebarCollapsed = useMemo\(\(\) => \{[\s\S]*?\}, \[(?:isOpen|open)\]\);\n/g;

const OUTER_FIXED =
  /<div className=\{`fixed top-0 bottom-0 right-0[^`]*`\}[^>]*>\s*\n?\s*<div([^>]*?)className="([^"]*bg-white[^"]*)"([^>]*)>/g;

const INSET_CENTER =
  /<div className="fixed inset-0 z-50 flex items-center justify-center bg-black[^"]*"[^>]*>\s*\n?\s*<div className="([^"]*bg-white[^"]*)"([^>]*)>/g;

const PANEL_CLASS =
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden';

function ensureImport(content) {
  if (content.includes("from '@/shared/components/common/AppModal'")) return content;
  const m = content.match(/^('use client'|"use client");?\s*\n/m);
  if (m) {
    const i = m.index + m[0].length;
    return `${content.slice(0, i)}import AppModal from '@/shared/components/common/AppModal';\n${content.slice(i)}`;
  }
  return `import AppModal from '@/shared/components/common/AppModal';\n${content}`;
}

function cleanupUseMemo(content) {
  if (content.includes('useMemo(')) return content;
  return content
    .replace(/,\s*useMemo/g, '')
    .replace(/useMemo,\s*/g, '')
    .replace(/import \{ useMemo \} from 'react';\n/g, '');
}

function openProp(content) {
  if (/\bisOpen\b/.test(content)) return 'isOpen';
  if (/\bopen\b/.test(content)) return 'open';
  return 'isOpen';
}

function normalizePanelClass(cls) {
  return cls
    .replace(/\s*rounded-[^"\s]+/g, '')
    .replace(/\s*max-w-[^"\s]+/g, '')
    .replace(/\s*max-h-[^"\s]+/g, '')
    .replace(/\s*w-full(?=\s)/g, '')
    .trim();
}

function wrapWithAppModal(content) {
  const prop = openProp(content);
  content = content.replace(/if \(!isOpen\) return null;\s*\n\s*return \(/g, 'return (');
  content = content.replace(/if \(!open\) return null;\s*\n\s*return \(/g, 'return (');

  content = content.replace(OUTER_FIXED, (_m, pre, cls, post) => {
    const merged = normalizePanelClass(cls);
    const panelClass = merged.includes('flex flex-col') && merged.includes('h-full') ? merged : PANEL_CLASS;
    return `<AppModal open={${prop}} onClose={onClose}>\n      <div${pre}className="${panelClass}"${post.replace(/\s*style=\{\{[^}]+\}\}/g, '')}>`;
  });

  content = content.replace(INSET_CENTER, (_m, cls, post) => {
    const panelClass = PANEL_CLASS;
    return `<AppModal open={${prop}} onClose={onClose}>\n      <div className="${panelClass}"${post.replace(/\s*style=\{\{[^}]+\}\}/g, '')}>`;
  });

  return content;
}

function fixClosings(content) {
  content = content.replace(/\s*style=\{\{ height: 'calc\([^']+\)' \}\}/g, '');
  content = content.replace(/\s*style=\{\{ width: sidebarCollapsed[^}]+\}\}/g, '');

  if (!content.includes('<AppModal')) return content;

  const hasConfirm = content.includes('<ConfirmDialog');
  const hasFragment = /return \(\s*\n\s*<>/.test(content);

  if (hasConfirm && !hasFragment) {
    content = content.replace(/return \(\s*\n\s*<AppModal/, 'return (\n    <>\n    <AppModal');
  }

  if (hasConfirm) {
    content = content.replace(
      /(\n\s*<\/div>)(\s*\n\s*(?:\{\/\*[^*]*Confirmation[^*]*\*\/\}\s*\n\s*)?<ConfirmDialog)/,
      '$1\n    </AppModal>$2',
    );
    content = content.replace(
      /(<ConfirmDialog[\s\S]*?\/>)\s*\n\s*<\/div>\s*\n(\s*\);)/,
      '$1\n    </>\n$2',
    );
  } else {
    content = content.replace(
      /(\n\s*<\/div>)\s*\n(\s*\);[\s\S]*?\n\})/,
      (match, closeDiv, rest) => {
        if (match.includes('</AppModal>')) return match;
        return `${closeDiv}\n    </AppModal>\n${rest}`;
      },
    );
  }

  return content;
}

for (const file of globSync('**/*.{tsx,ts}', { cwd: ROOT, absolute: true })) {
  if (SKIP.has(path.basename(file))) continue;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  if (content.includes('sidebarCollapsed') || content.match(/fixed inset-0[\s\S]*?justify-center/)) {
    content = content.replace(SIDEBAR_BLOCK, '\n');
    content = cleanupUseMemo(content);
    content = wrapWithAppModal(content);
    content = ensureImport(content);
  }

  content = fixClosings(content);

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('fixed:', path.relative(ROOT, file));
  }
}

console.log('Fix pass complete.');
