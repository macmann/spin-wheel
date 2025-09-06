import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const filePaths = {
  rewards: path.join(dataDir, 'rewards.json'),
  codes: path.join(dataDir, 'codes.json')
};

export async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

export async function writeJSON(file, data) {
  try {
    if (fsSync.existsSync(file)) {
      const backupPath = `${file}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await fs.copyFile(file, backupPath);
    }
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  } catch (err) {
    throw err;
  }
}
