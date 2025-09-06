import express from 'express';
import { filePaths, readJSON, writeJSON } from '../utils/fileStorage.js';

const router = express.Router();

router.post('/allocate', async (req, res) => {
  const { rewardId, userIdentifier } = req.body;
  if (!rewardId || !userIdentifier) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }
  const rewards = await readJSON(filePaths.rewards);
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) {
    return res.status(404).json({ error: 'REWARD_NOT_FOUND' });
  }
  const codes = await readJSON(filePaths.codes);
  const code = codes.find(c => c.rewardId === rewardId && !c.used);
  if (!code) {
    return res.status(409).json({ error: 'OUT_OF_STOCK' });
  }
  const now = new Date().toISOString();
  code.used = true;
  code.usedBy = userIdentifier;
  code.usedAt = now;
  code.updatedAt = now;
  await writeJSON(filePaths.codes, codes);
  res.json({ code: code.code, amount: code.amount, rewardName: reward.name });
});

export default router;
