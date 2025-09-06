import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dataDir, 'backups');

export const filePaths = {
  rewards: path.join(dataDir, 'rewards.json'),
  codes: path.join(dataDir, 'codes.json'),
  backups: backupDir
};

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

export async function writeJSON(file, data) {
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (await fileExists(file)) {
    const base = path.basename(file);
    const backupPath = path.join(backupDir, `${base}.${timestamp}.bak`);
    await fs.copyFile(file, backupPath);
  }
  const tempFile = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, file);
}
