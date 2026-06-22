/**
 * Migrates modal panels to scrollable APP_MODAL_PANEL pattern.
 * Run: node scripts/fix-modal-scroll.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const PANEL_PATTERNS = [
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-hidden',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl w-full h-full flex flex-col overflow-hidden',
  'bg-gray-50 shadow-2xl w-full h-full flex flex-col overflow-hidden min-h-0 min-w-0',
  'flex flex-col h-full w-full bg-white shadow-2xl',
  'flex max-h-full h-full w-full flex-col overflow-hidden bg-white shadow-xl min-h-0',
  'bg-white shadow-2xl w-full h-full flex flex-col',
  'bg-white shadow-2xl w-full h-full overflow-y-auto flex flex-col',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl w-full h-full overflow-y-auto',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-y-auto',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl relative',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-y-auto',
  'flex flex-col h-full w-full min-h-0 min-w-0 bg-slate-100 shadow-xl overflow-y-auto',
];

const HEADER_HINTS = ['border-b', 'sticky top-0', 'shrink-0', 'flex-shrink-0', 'flex-shrink-0'];
const FOOTER_HINTS = ['border-t', 'sticky bottom-0', 'justify-end'];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') walk(full, files);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function ensureImport(content) {
  if (!content.includes('APP_MODAL_PANEL')) return content;

  const namedImport = /import AppModal,\s*\{([^}]*)\}\s*from ['"]@\/shared\/components\/common\/AppModal['"]/;
  const defaultOnly = /import AppModal from ['"]@\/shared\/components\/common\/AppModal['"]/;

  if (namedImport.test(content)) {
    return content.replace(namedImport, (match, inner) => {
      const names = inner.split(',').map((s) => s.trim()).filter(Boolean);
      if (!names.includes('APP_MODAL_PANEL')) names.push('APP_MODAL_PANEL');
      return `import AppModal, { ${names.join(', ')} } from '@/shared/components/common/AppModal'`;
    });
  }

  if (defaultOnly.test(content)) {
    return content.replace(
      defaultOnly,
      `import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal'`,
    );
  }

  if (content.includes('ContentAreaModal') && content.includes('{APP_MODAL_PANEL}')) {
    return content.replace(
      /import ContentAreaModal from ['"]@\/shared\/components\/common\/ContentAreaModal['"]/,
      `import ContentAreaModal from '@/shared/components/common/ContentAreaModal'\nimport { APP_MODAL_PANEL } from '@/shared/components/common/AppModal'`,
    );
  }

  return content;
}

function addStickyToHeaderLines(content) {
  return content.replace(
    /className="([^"]*(?:border-b|Border-b)[^"]*)"/g,
    (match, classes) => {
      if (classes.includes('APP_MODAL_HEADER') || classes.includes('sticky top-0')) return match;
      if (!classes.includes('bg-white') && !classes.includes('bg-gray')) return match;
      let next = classes;
      if (!next.includes('sticky top-0')) next += ' sticky top-0 z-10 shrink-0';
      return `className="${next}"`;
    },
  );
}

function addStickyToFooterLines(content) {
  return content.replace(
    /className="([^"]*(?:border-t)[^"]*(?:justify-end|flex justify-end)[^"]*)"/g,
    (match, classes) => {
      if (classes.includes('APP_MODAL_FOOTER') || classes.includes('sticky bottom-0')) return match;
      let next = classes;
      if (!next.includes('sticky bottom-0')) next += ' sticky bottom-0 z-10 shrink-0 bg-white';
      return `className="${next}"`;
    },
  );
}

let updated = 0;
for (const file of walk(srcRoot)) {
  if (file.includes('AppModal.tsx')) continue;

  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('AppModal') && !content.includes('<AppModal') && !content.includes('ContentAreaModal')) continue;

  let changed = false;
  for (const pattern of PANEL_PATTERNS) {
    if (content.includes(pattern)) {
      content = content.split(pattern).join('{APP_MODAL_PANEL}');
      content = content.replace(/className="\{APP_MODAL_PANEL\}"/g, 'className={APP_MODAL_PANEL}');
      content = content.replace(/className='\{APP_MODAL_PANEL\}'/g, 'className={APP_MODAL_PANEL}');
      changed = true;
    }
  }

  if (changed) {
    content = ensureImport(content);
    content = addStickyToHeaderLines(content);
    content = addStickyToFooterLines(content);
    fs.writeFileSync(file, content);
    updated++;
    console.log('Updated:', path.relative(srcRoot, file));
  }
}

console.log(`Done. Updated ${updated} files.`);
