import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const ROOT = path.join(process.cwd(), 'src');
const SKIP = new Set([
  'ContentAreaModal.tsx',
  'AppModal.tsx',
  'ConfirmDialog.tsx',
  'AlertDialog.tsx',
  'Sidebar.tsx',
]);

const SIDEBAR_BLOCK =
  /\n\s*const sidebarCollapsed = useMemo\(\(\) => \{[\s\S]*?\}, \[isOpen\]\);\n/g;

const SIDEBAR_BLOCK_OPEN =
  /\n\s*const sidebarCollapsed = useMemo\(\(\) => \{[\s\S]*?\}, \[open\]\);\n/g;

const OUTER_SIDEBAR_WRAPPER =
  /<div className=\{`fixed[^`]*`\}[^>]*>\s*\n?\s*<div([^>]*?)className="([^"]*bg-white[^"]*)"([^>]*)>/g;

const INSET_CENTER_WRAPPER =
  /<div className="fixed inset-0[^"]*flex items-center justify-center[^"]*"[^>]*>\s*\n?\s*<div className="([^"]*bg-white[^"]*)"([^>]*)>/g;

const IMPORT_LINE =
  "import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';";

function ensureImport(content) {
  if (content.includes("from '@/shared/components/common/AppModal'")) return content;
  const useClient = content.match(/^('use client'|"use client");?\s*\n/m);
  if (useClient) {
    const idx = useClient.index + useClient[0].length;
    return `${content.slice(0, idx)}${IMPORT_LINE}\n${content.slice(idx)}`;
  }
  return `${IMPORT_LINE}\n${content}`;
}

function cleanupUseMemoImport(content) {
  if (content.includes('useMemo(')) return content;
  return content
    .replace(/,\s*useMemo/g, '')
    .replace(/useMemo,\s*/g, '')
    .replace(/import \{ useMemo \} from 'react';\n/g, '');
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  if (SKIP.has(path.basename(filePath))) return false;
  if (!content.includes('sidebarCollapsed') && !content.match(/fixed inset-0[\s\S]*?justify-center/)) {
    return false;
  }

  content = content.replace(SIDEBAR_BLOCK, '\n');
  content = content.replace(SIDEBAR_BLOCK_OPEN, '\n');
  content = cleanupUseMemoImport(content);

  content = content.replace(/if \(!isOpen\) return null;\s*\n\s*return \(/g, 'return (');
  content = content.replace(/if \(!open\) return null;\s*\n\s*return \(/g, 'return (');

  content = content.replace(
    OUTER_SIDEBAR_WRAPPER,
    (_match, pre, cls, post) =>
      `<AppModal open={isOpen} onClose={onClose}>\n      <div${pre}className="${APP_MODAL_PANEL_CLASS(cls)}"${post}>`,
  );

  content = content.replace(
    /<div className=\{`fixed[^`]*`\}[^>]*>\s*\n?\s*<div([^>]*?)className="([^"]*bg-white[^"]*)"([^>]*)>/g,
    (_match, pre, cls, post) =>
      `<AppModal open={open} onClose={onClose}>\n      <div${pre}className="${APP_MODAL_PANEL_CLASS(cls)}"${post}>`,
  );

  content = content.replace(
    INSET_CENTER_WRAPPER,
    (_match, cls, post) =>
      `<AppModal open={open} onClose={onClose}>\n      <div className="${APP_MODAL_PANEL_CLASS(cls)}"${post}>`,
  );

  // Close outermost modal wrapper before sibling ConfirmDialog or end
  content = content.replace(
    /(\n\s*)<\/div>(\s*\n\s*<ConfirmDialog)/g,
    '$1</div>$1</AppModal>$2',
  );

  if (content !== original) {
    content = ensureImport(content);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function APP_MODAL_PANEL_CLASS(existing) {
  const base = 'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden';
  if (existing.includes('flex flex-col') && existing.includes('h-full')) {
    return existing.replace(/\s*rounded-[^"\s]+/g, '').replace(/\s*max-w-[^"\s]+/g, '').replace(/\s*max-h-[^"\s]+/g, '');
  }
  return base;
}

const files = globSync('**/*.{tsx,ts}', { cwd: ROOT, absolute: true });
let count = 0;
for (const file of files) {
  if (migrateFile(file)) {
    count += 1;
    console.log('migrated:', path.relative(ROOT, file));
  }
}
console.log(`Done. ${count} file(s) updated.`);
