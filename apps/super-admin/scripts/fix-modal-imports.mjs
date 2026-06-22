/**
 * Fix missing APP_MODAL_PANEL imports after modal scroll migration.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next'].includes(entry.name)) walk(full, files);
    } else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function fixImports(content) {
  if (!content.includes('APP_MODAL_PANEL')) return content;

  const namedImport = /import AppModal,\s*\{([^}]*)\}\s*from ['"]@\/shared\/components\/common\/AppModal['"]/;
  const defaultOnly = /import AppModal from ['"]@\/shared\/components\/common\/AppModal['"]/;

  const needsPanel = content.includes('APP_MODAL_PANEL') && !/\bAPP_MODAL_PANEL\b/.test(
    content.match(namedImport)?.[1] || '',
  );

  if (!needsPanel && !content.match(defaultOnly)) return content;

  if (namedImport.test(content)) {
    return content.replace(namedImport, (match, inner) => {
      const names = inner.split(',').map((s) => s.trim()).filter(Boolean);
      const extras = ['APP_MODAL_PANEL', 'APP_MODAL_PANEL_STRUCTURED'];
      for (const name of extras) {
        if (content.includes(name) && !names.includes(name)) names.push(name);
      }
      return `import AppModal, { ${names.join(', ')} } from '@/shared/components/common/AppModal'`;
    });
  }

  if (defaultOnly.test(content)) {
    const extras = [];
    if (content.includes('APP_MODAL_PANEL')) extras.push('APP_MODAL_PANEL');
    if (content.includes('APP_MODAL_PANEL_STRUCTURED')) extras.push('APP_MODAL_PANEL_STRUCTURED');
    if (content.includes('APP_MODAL_HEADER')) extras.push('APP_MODAL_HEADER');
    if (content.includes('APP_MODAL_BODY')) extras.push('APP_MODAL_BODY');
    if (content.includes('APP_MODAL_FOOTER')) extras.push('APP_MODAL_FOOTER');
    if (extras.length === 0) return content;
    return content.replace(
      defaultOnly,
      `import AppModal, { ${extras.join(', ')} } from '@/shared/components/common/AppModal'`,
    );
  }

  return content;
}

let updated = 0;
for (const file of walk(srcRoot)) {
  if (file.endsWith('AppModal.tsx')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const next = fixImports(content);
  if (next !== content) {
    fs.writeFileSync(file, next);
    updated++;
    console.log('Fixed import:', path.relative(srcRoot, file));
  }
}
console.log(`Fixed ${updated} files.`);
