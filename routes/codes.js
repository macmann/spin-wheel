import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { filePaths, readJSON, writeJSON } from '../utils/fileStorage.js';

const router = express.Router();

// List codes for a reward
router.get('/rewards/:id/codes', async (req, res) => {
  const { id } = req.params;
  const status = req.query.status || 'all';
  const codes = await readJSON(filePaths.codes);
  let rewardCodes = codes.filter(c => c.rewardId === id);
  if (status === 'used') rewardCodes = rewardCodes.filter(c => c.used);
  if (status === 'unused') rewardCodes = rewardCodes.filter(c => !c.used);
  res.json(rewardCodes);
});

// Bulk add codes
router.post('/rewards/:id/codes', async (req, res) => {
  const { id } = req.params;
  let { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: 'CODES_REQUIRED' });
  }
  if (codes.length > 20) {
    return res.status(400).json({ error: 'MAX_20_CODES' });
  }
  const rewards = await readJSON(filePaths.rewards);
  if (!rewards.find(r => r.id === id)) {
    return res.status(404).json({ error: 'REWARD_NOT_FOUND' });
  }
  const existingCodes = await readJSON(filePaths.codes);
  const results = [];
  for (const entry of codes) {
    let code;
    let amount;
    if (typeof entry === 'string') {
      code = entry.trim();
    } else if (entry && typeof entry === 'object') {
      code = entry.code ? String(entry.code).trim() : '';
      if (entry.amount !== undefined) amount = Number(entry.amount);
    }
    if (!code) {
      results.push({ code: entry.code || entry, status: 'invalid' });
      continue;
    }
    if (existingCodes.some(c => c.rewardId === id && c.code === code)) {
      results.push({ code, status: 'duplicate' });
      continue;
    }
    const now = new Date().toISOString();
    const codeObj = {
      id: uuidv4(),
      rewardId: id,
      code,
      amount,
      used: false,
      createdAt: now,
      updatedAt: now
    };
    existingCodes.push(codeObj);
    results.push({ code, status: 'created', id: codeObj.id });
  }
  await writeJSON(filePaths.codes, existingCodes);
  res.status(201).json({ results });
});

// Mark code as used
router.patch('/codes/:id/use', async (req, res) => {
  const { id } = req.params;
  const { usedBy } = req.body;
  if (!usedBy) {
    return res.status(400).json({ error: 'USED_BY_REQUIRED' });
  }
  const codes = await readJSON(filePaths.codes);
  const code = codes.find(c => c.id === id);
  if (!code) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (code.used) {
    return res.status(400).json({ error: 'ALREADY_USED' });
  }
  const now = new Date().toISOString();
  code.used = true;
  code.usedBy = usedBy;
  code.usedAt = now;
  code.updatedAt = now;
  await writeJSON(filePaths.codes, codes);
  res.json(code);
});

// Delete unused code
router.delete('/codes/:id', async (req, res) => {
  const { id } = req.params;
  const codes = await readJSON(filePaths.codes);
  const index = codes.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (codes[index].used) {
    return res.status(400).json({ error: 'ALREADY_USED' });
  }
  codes.splice(index, 1);
  await writeJSON(filePaths.codes, codes);
  res.json({ success: true });
});

export default router;
