import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { filePaths, readJSON, writeJSON } from '../utils/fileStorage.js';

const router = express.Router();

// List all rewards
router.get('/', async (req, res) => {
  const rewards = await readJSON(filePaths.rewards);
  res.json(rewards);
});

// Create new reward
router.post('/', async (req, res) => {
  const { name, costPoints } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'NAME_REQUIRED' });
  }
  const rewards = await readJSON(filePaths.rewards);
  const now = new Date().toISOString();
  const reward = {
    id: uuidv4(),
    name: name.trim(),
    costPoints: Number(costPoints) || 0,
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
  const reward = rewards[index];
  const { name, costPoints } = req.body;
  if (name !== undefined) reward.name = name;
  if (costPoints !== undefined) reward.costPoints = Number(costPoints);
  reward.updatedAt = new Date().toISOString();
  rewards[index] = reward;
  await writeJSON(filePaths.rewards, rewards);
  res.json(reward);
});

// Delete reward
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const rewards = await readJSON(filePaths.rewards);
  const index = rewards.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  rewards.splice(index, 1);
  await writeJSON(filePaths.rewards, rewards);
  res.json({ success: true });
});

export default router;
