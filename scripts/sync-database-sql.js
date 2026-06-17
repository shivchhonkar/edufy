#!/usr/bin/env node
/**
 * Copy database/*.sql into apps/super-admin/database/ for production deploys.
 * Next.js API routes run with cwd=apps/super-admin; repo-root database/ may be absent on server.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'database')
const TARGET = path.join(ROOT, 'apps/super-admin/database')

function copySqlTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`Source not found: ${srcDir}`)
    process.exit(1)
  }

  fs.mkdirSync(destDir, { recursive: true })

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      copySqlTree(srcPath, destPath)
    } else if (entry.name.endsWith('.sql')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

copySqlTree(SOURCE, TARGET)
console.log(`Synced SQL files: ${SOURCE} → ${TARGET}`)
