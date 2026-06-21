import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('AppModal')) return false;

  const original = content;

  // Remove extra </div> immediately before </AppModal>
  content = content.replace(/(\n[ \t]*)<\/div>\n([ \t]*)<\/div>\n([ \t]*)<\/AppModal>/g, '$1</div>\n$2</AppModal>');

  // Close AppModal where an extra </div> was used before conditional end
  content = content.replace(
    /(<AppModal[\s\S]*?)(\n[ \t]*)<\/div>\n([ \t]*)<\/div>\n([ \t]*)\)\}/g,
    (match, start, indent1, indent2, indent3) => {
      if (start.includes('</AppModal>')) return match;
      return `${start}${indent1}</div>\n${indent2}</AppModal>\n${indent3})}`;
    },
  );

  // Fix undefined `open` in modal subcomponents that are conditionally mounted
  content = content.replace(
    /<AppModal open=\{open\} onClose=\{onClose\}>/g,
    '<AppModal open onClose={onClose}>',
  );

  // Fix page-level modals using bogus open/onClose identifiers
  content = content.replace(
    /\{showSubjectModal && \(\s*\n\s*<AppModal open onClose=\{onClose\}>/g,
    '{showSubjectModal && (\n        <AppModal open={showSubjectModal} onClose={() => { setShowSubjectModal(false); setEditingSubject(null); }}>',
  );

  content = content.replace(
    /\{showModal && \(\s*\n\s*<AppModal open onClose=\{onClose\}>/g,
    '{showModal && (\n          <AppModal open={showModal} onClose={() => setShowModal(false)}>',
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const fixed = [];
for (const file of walk(srcRoot)) {
  if (fixFile(file)) fixed.push(path.relative(srcRoot, file));
}

console.log(`Fixed ${fixed.length} file(s):`);
for (const f of fixed) console.log(`  - ${f}`);
