/**
 * One-time migration: replace @/lib/db with getRequestDb in API routes.
 * Run from repo root: node apps/super-admin/scripts/migrate-routes-to-request-db.js
 */
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../src/app/api');

function walk(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (f === 'route.ts') files.push(full);
  }
  return files;
}

const routes = walk(apiDir);
let updated = 0;

for (const file of routes) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("'@/lib/db'") && !content.includes('"@/lib/db"')) continue;

  const original = content;

  // 1. Replace imports
  content = content.replace(/import pool from ['"]@\/lib\/db['"];?\s*\n?/g, '');
  content = content.replace(/import \{ query \} from ['"]@\/lib\/db['"];?\s*\n?/g, '');
  content = content.replace(/import \{ query, transaction \} from ['"]@\/lib\/db['"];?\s*\n?/g, '');
  content = content.replace(/import \{ transaction, query \} from ['"]@\/lib\/db['"];?\s*\n?/g, '');
  if (content !== original) {
    if (!content.includes('getRequestDb')) {
      const firstImport = content.indexOf('import ');
      const endOfFirstLine = content.indexOf('\n', firstImport);
      content = content.slice(0, endOfFirstLine + 1) + "import { getRequestDb } from '@/lib/request-db';\n" + content.slice(endOfFirstLine + 1);
    }
  }

  // 2. Add const { db } = await getRequestDb(request); at start of each export async function handler
  content = content.replace(
    /(export async function (?:GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\)\s*\{)\s*try\s*\{/g,
    '$1\n  try {\n    const { db } = await getRequestDb(request);'
  );

  // 3. Replace pool.query( with db.query(
  content = content.replace(/\bpool\.query\(/g, 'db.query(');

  // 4. Replace await query( with await db.query( (avoid double db.db)
  content = content.replace(/\bawait query\(/g, 'await db.query(');
  content = content.replace(/\bquery\(/g, 'db.query(');

  // 5. Replace await transaction( with await db.transaction(
  content = content.replace(/\bawait transaction\(/g, 'await db.transaction(');

  if (content !== original) {
    fs.writeFileSync(file, content);
    updated++;
    console.log('Updated:', path.relative(apiDir, file));
  }
}

console.log('Done. Updated', updated, 'files.');
