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

  // Revert mistaken </AppModal> inside nested blocks (maps, conditionals).
  content = content.replace(/^(\s{14,})<\/AppModal>/gm, '$1</div>');

  // Remove extra </div> immediately before </AppModal> when duplicated.
  content = content.replace(/(\n[ \t]*)<\/div>\n([ \t]*)<\/div>\n([ \t]*)<\/AppModal>/g, '$1</div>\n$2</AppModal>');

  // Close modals that end with </div></div>)} instead of </div></AppModal>)}.
  content = content.replace(
    /(<AppModal[\s\S]*?)(\n[ \t]*)<\/div>\n([ \t]*)<\/div>\n([ \t]*)\)\}/g,
    (match, start, indent1, indent2, indent3) => {
      if (start.includes('</AppModal>')) return match;
      return `${start}${indent1}</div>\n${indent2}</AppModal>\n${indent3})}`;
    },
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

console.log(`Fixed ${fixed.length} file(s)`);
for (const f of fixed) console.log(`  - ${f}`);
