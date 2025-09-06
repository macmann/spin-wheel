import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readJSON, writeJSON, filePaths } from '../utils/fileStorage.js';
import rewardsRouter from '../routes/rewards.js';

const BASE_REWARD = {
  id: 'r1',
  name: 'Test Reward',
  costPoints: 100,
  description: '',
  isActive: true,
  displayPriority: 10,
  dailyRedeemCap: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function startTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/rewards', rewardsRouter);
  return new Promise(resolve => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('cannot delete reward with used codes', async () => {
  const originalRewards = await readJSON(filePaths.rewards);
  const originalCodes = await readJSON(filePaths.codes);
  try {
    await writeJSON(filePaths.rewards, [BASE_REWARD]);
    await writeJSON(filePaths.codes, [{ id: 'c1', rewardId: 'r1', code: 'AAA', used: true }]);

    const { server, port } = await startTestServer();
    const res = await fetch(`http://localhost:${port}/rewards/r1`, { method: 'DELETE' });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.error, 'HAS_USED_CODES');
    server.close();
  } finally {
    await writeJSON(filePaths.rewards, originalRewards);
    await writeJSON(filePaths.codes, originalCodes);
  }
});
