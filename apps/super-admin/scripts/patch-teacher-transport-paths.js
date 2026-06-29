const TEACHER_DIRS = [
  'c:/Shiv/Projects/edufy/apps/super-admin/src/app/teacher',
  'c:/Shiv/Projects/edufy/apps/super-admin/src/features/teacher-portal',
];
const TRANSPORT_DIRS = [
  'c:/Shiv/Projects/edufy/apps/super-admin/src/app/transport',
  'c:/Shiv/Projects/edufy/apps/super-admin/src/features/transport/components',
];

function patchFile(file, { apiBase, routeFn, clientAuthImport }) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content
    .replace(/@\/lib\/auth/g, clientAuthImport)
    .replace(/fetch\(['"`]\/api\/(?!teacher\/|transport\/|parent\/)/g, (m) =>
      m.replace('/api/', `/api/${apiBase}/`),
    );

  const needsRoute =
    /router\.(push|replace)\(\s*['"`]\/(?!teacher|transport|parent|login|admin)/.test(content) ||
    /href=['"`]\/(?!teacher|transport|parent|login|admin|api)/.test(content);

  if (needsRoute && !content.includes(`${routeFn}(`)) {
    const importLine = `import { ${routeFn} } from '@/lib/${apiBase}-portal/constants';\n`;
    if (content.includes("'use client'")) {
      content = content.replace(/('use client'[^\n]*\n)/, `$1\n${importLine}`);
    } else {
      content = importLine + content;
    }
  }

  content = content.replace(
    /href=['"`](\/(?!teacher|transport|parent|login|admin|api)[^'"`]+)['"`]/g,
    `href={${routeFn}('$1')}`,
  );

  content = content.replace(
    /router\.(push|replace)\(\s*['"`](\/(?!teacher|transport|parent|login|admin)[^'"`]+)['"`]\s*\)/g,
    `router.$1(${routeFn}('$2'))`,
  );

  if (content !== original) fs.writeFileSync(file, content);
}

const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (/\.tsx?$/.test(entry.name)) cb(full);
  }
}

for (const dir of TEACHER_DIRS) {
  walk(dir, (file) =>
    patchFile(file, {
      apiBase: 'teacher',
      routeFn: 'teacherRoute',
      clientAuthImport: '@/lib/teacher-portal/client-auth',
    }),
  );
}

for (const dir of TRANSPORT_DIRS) {
  walk(dir, (file) =>
    patchFile(file, {
      apiBase: 'transport',
      routeFn: 'transportRoute',
      clientAuthImport: '@/lib/teacher-portal/client-auth',
    }),
  );
}

// transport pages at app/transport root
walk('c:/Shiv/Projects/edufy/apps/super-admin/src/app/transport', (file) => {
  if (file.includes('features')) return;
  patchFile(file, {
    apiBase: 'transport',
    routeFn: 'transportRoute',
    clientAuthImport: '@/lib/teacher-portal/client-auth',
  });
});

console.log('portal path patch complete');
