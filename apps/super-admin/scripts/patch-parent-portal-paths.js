const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../src/app/parent');

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.name.endsWith('.tsx')) cb(full);
  }
}

walk(root, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/\/api\/(?!parent\/)/g, '/api/parent/');

  const needsParentRoute =
    /router\.(push|replace)\(\s*['"`]\/(?!parent|login)/.test(content) ||
    content.includes('parentRoute(');

  if (needsParentRoute && !content.includes("from '@/lib/parent-portal/constants'")) {
    const importLine = "import { parentRoute } from '@/lib/parent-portal/constants';\n";
    if (content.includes("'use client'")) {
      content = content.replace(/('use client'[^\n]*\n)/, `$1\n${importLine}`);
    } else {
      content = importLine + content;
    }
  }

  content = content.replace(
    /router\.(push|replace)\(\s*['"`](\/(?!parent|login)[^'"`]+)['"`]\s*\)/g,
    "router.$1(parentRoute('$2'))",
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('patched', path.relative(root, file));
  }
});
