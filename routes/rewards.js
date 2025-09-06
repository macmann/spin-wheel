import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { filePaths, readJSON, writeJSON } from '../utils/fileStorage.js';
import { getAllRewardStats, getRewardStats } from '../utils/rewardUtils.js';

const router = express.Router();

function validateReward(body, partial = false) {
  const { name, costPoints, displayPriority, dailyRedeemCap } = body;
  if (!partial || name !== undefined) {
    if (!name || !String(name).trim()) {
      return { error: 'NAME_REQUIRED', message: 'Name is required' };
    }
  }
  if (!partial || costPoints !== undefined) {
    const cost = Number(costPoints);
    if (!Number.isInteger(cost) || cost < 1) {
      return { error: 'COST_POINTS_INVALID', message: 'costPoints must be >= 1' };
    }
  }
  if (displayPriority !== undefined) {
    const p = Number(displayPriority);
    if (!Number.isInteger(p)) {
      return { error: 'PRIORITY_INVALID', message: 'displayPriority must be integer' };
    }
  }
  if (dailyRedeemCap !== undefined) {
    const c = Number(dailyRedeemCap);
    if (!Number.isInteger(c) || c < 0) {
      return { error: 'DAILY_CAP_INVALID', message: 'dailyRedeemCap must be >= 0' };
    }
  }
  return null;
}

// List all rewards with code stats
router.get('/', async (req, res) => {
  const rewards = await readJSON(filePaths.rewards);
  const stats = await getAllRewardStats();
  const result = rewards.map(r => ({
    ...r,
    ...(stats[r.id] || { unusedCodes: 0, usedCodes: 0 })
  }));
  res.json(result);
});

// Create new reward
router.post('/', async (req, res) => {
  const err = validateReward(req.body);
  if (err) return res.status(400).json(err);

  const {
    name,
    costPoints,
    description = '',
    isActive = true,
    displayPriority = 10,
    dailyRedeemCap = 0
  } = req.body;

  const rewards = await readJSON(filePaths.rewards);
  const now = new Date().toISOString();
  const reward = {
    id: uuidv4(),
    name: name.trim(),
    costPoints: Number(costPoints),
    description,
    isActive: Boolean(isActive),
    displayPriority: Number(displayPriority),
    dailyRedeemCap: Number(dailyRedeemCap),
    createdAt: now,
    updatedAt: now
  };
  rewards.push(reward);
  await writeJSON(filePaths.rewards, rewards);
  res.status(201).json(reward);
});

// Update reward
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const rewards = await readJSON(filePaths.rewards);
  const index = rewards.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  const err = validateReward(req.body, true);
  if (err) return res.status(400).json(err);

  const reward = rewards[index];
  const {
    name,
    costPoints,
    description,
    isActive,
    displayPriority,
    dailyRedeemCap
  } = req.body;
  if (name !== undefined) reward.name = String(name).trim();
  if (costPoints !== undefined) reward.costPoints = Number(costPoints);
  if (description !== undefined) reward.description = String(description);
  if (isActive !== undefined) reward.isActive = Boolean(isActive);
  if (displayPriority !== undefined) reward.displayPriority = Number(displayPriority);
  if (dailyRedeemCap !== undefined) reward.dailyRedeemCap = Number(dailyRedeemCap);
  reward.updatedAt = new Date().toISOString();
  rewards[index] = reward;
  await writeJSON(filePaths.rewards, rewards);
  res.json(reward);
});

// Delete reward with guard on used codes
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const rewards = await readJSON(filePaths.rewards);
  const index = rewards.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  const stats = await getRewardStats(id);
  if (stats.usedCodes > 0) {
    return res.status(409).json({ error: 'HAS_USED_CODES', message: 'Cannot delete reward with used codes' });
  }
  rewards.splice(index, 1);
  await writeJSON(filePaths.rewards, rewards);

  const codes = await readJSON(filePaths.codes);
  const remainingCodes = codes.filter(c => c.rewardId !== id);
  if (remainingCodes.length !== codes.length) {
    await writeJSON(filePaths.codes, remainingCodes);
  }
  res.json({ success: true });
});

export default router;
