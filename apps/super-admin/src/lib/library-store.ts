import { promises as fs } from 'fs';
import path from 'path';

const STORE_PATHS = [
  path.resolve(process.cwd(), 'apps', 'super-admin', 'database', 'library-data.json'),
  path.resolve(process.cwd(), 'database', 'library-data.json'),
  path.resolve(process.cwd(), 'src', 'database', 'library-data.json'),
];

async function resolveDataPath() {
  for (const candidate of STORE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error(`Library store file not found. Tried: ${STORE_PATHS.join(', ')}`);
}

export async function readStore() {
  const dataPath = await resolveDataPath();
  const raw = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(raw) as any;
}

export async function writeStore(data: any) {
  const dataPath = await resolveDataPath();
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function nextId(items: { id: number }[]) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}
