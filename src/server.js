import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const configPath = path.join(dataDir, 'config.json');
const logsPath = path.join(dataDir, 'logs.json');
const usersPath = path.join(dataDir, 'users.json');
const rewardsPath = path.join(dataDir, 'rewards.json');
const codesPath = path.join(dataDir, 'codes.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function canSpin(phone) {
  const config = readJSON(configPath);
  const logs = readJSON(logsPath).filter(l => l.userId === phone);
  const intervalMs = (config.intervalHours || 24) * 60 * 60 * 1000;
  const maxSpins = config.spinsPerInterval || 1;
  const now = Date.now();
  const recent = logs.filter(l => now - new Date(l.timestamp).getTime() < intervalMs);
  if (recent.length < maxSpins) {
    return { canSpin: true, remaining: maxSpins - recent.length };
  }
  const oldest = recent.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
  const nextSpin = new Date(new Date(oldest.timestamp).getTime() + intervalMs);
  return { canSpin: false, nextSpin };
}

const app = express();
app.use(cors());
// Allow larger JSON bodies so base64-encoded logos can be saved
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Expose selected environment variables to the client
app.get('/env.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.ENV=${JSON.stringify({
    ADSENSE_CLIENT_ID: process.env.ADSENSE_CLIENT_ID || '',
    AD_SLOT_MOBILE_ID: process.env.AD_SLOT_MOBILE_ID || '',
    AD_SLOT_DESKTOP_ID: process.env.AD_SLOT_DESKTOP_ID || ''
  })};`);
});

// Auth endpoints
app.post('/api/register', (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'missing fields' });
  }
  const users = readJSON(usersPath);
  if (users[phone]) {
    return res.status(400).json({ error: 'user exists' });
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  users[phone] = { name, password: hash, points: 0, redeemed: {} };
  writeJSON(usersPath, users);
  res.json({ status: 'registered' });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  const users = readJSON(usersPath);
  const user = users[phone];
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (!user || user.password !== hash) {
    return res.status(400).json({ error: 'invalid credentials' });
  }
  res.json({ status: 'ok', name: user.name, phone, points: user.points });
});

// Config endpoints
app.get('/api/config', (req, res) => {
  res.json(readJSON(configPath));
});
app.post('/api/config', (req, res) => {
  writeJSON(configPath, req.body);
  res.json({ status: 'ok' });
});

app.post('/api/canspin', (req, res) => {
  const { phone } = req.body;
  const status = canSpin(phone);
  res.json({
    canSpin: status.canSpin,
    remaining: status.remaining,
    nextSpin: status.nextSpin ? status.nextSpin.toISOString() : null
  });
});

// Redemption rewards configuration and codes
app.get('/api/rewards', (req, res) => {
  res.json(readJSON(rewardsPath));
});
app.post('/api/rewards', (req, res) => {
  const { name, cost } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const rewards = readJSON(rewardsPath);
  const id = rewards.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
  const reward = { id, name, cost: Number(cost) || 0 };
  rewards.push(reward);
  writeJSON(rewardsPath, rewards);
  res.json(reward);
});

app.get('/api/rewards/:id/codes', (req, res) => {
  const rewardId = Number(req.params.id);
  const codes = readJSON(codesPath).filter(c => c.rewardId === rewardId);
  res.json(codes);
});

app.post('/api/rewards/:id/codes', (req, res) => {
  const rewardId = Number(req.params.id);
  const { category, codes } = req.body;
  if (!category || !Array.isArray(codes)) {
    return res.status(400).json({ error: 'invalid payload' });
  }
  const allCodes = readJSON(codesPath);
  let nextId = allCodes.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1;
  const newEntries = codes
    .filter(code => code && code.trim())
    .map(code => ({
      id: nextId++,
      rewardId,
      category,
      code: code.trim(),
      used: false,
      createdAt: new Date().toISOString()
    }));
  allCodes.push(...newEntries);
  writeJSON(codesPath, allCodes);
  res.json({ status: 'ok', added: newEntries.length });
});

app.delete('/api/codes/:id', (req, res) => {
  const codeId = Number(req.params.id);
  const codes = readJSON(codesPath);
  const idx = codes.findIndex(c => c.id === codeId);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  if (codes[idx].used) return res.status(400).json({ error: 'code used' });
  codes.splice(idx, 1);
  writeJSON(codesPath, codes);
  res.json({ status: 'deleted' });
});

// User reward listings
app.get('/api/rewards/:phone', (req, res) => {
  const rewards = readJSON(rewardsPath);
  const codes = readJSON(codesPath);
  const users = readJSON(usersPath);
  const phone = req.params.phone;
  const user = users[phone] || { redeemed: {} };
  const data = rewards.map(r => {
    const available = codes.filter(c => c.rewardId === r.id && !c.used).length;
    const redeemedCode = codes.find(c => c.rewardId === r.id && c.usedBy === phone)?.code || null;
    return {
      id: r.id,
      name: r.name,
      cost: r.cost || 0,
      redeemedCode,
      available
    };
  });
  res.json(data);
});

app.post('/api/redeem', (req, res) => {
  const { phone, rewardId } = req.body;
  const rewards = readJSON(rewardsPath);
  const users = readJSON(usersPath);
  const codes = readJSON(codesPath);
  const user = users[phone];
  if (!user) return res.status(400).json({ error: 'user not found' });
  user.redeemed = user.redeemed || {};
  if (user.redeemed[rewardId]) return res.status(400).json({ error: 'already redeemed' });
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) return res.status(400).json({ error: 'reward not found' });
  const cost = reward.cost || 0;
  if ((user.points || 0) < cost) {
    return res.status(400).json({ error: 'Not enough points. Come back later when you have points.' });
  }
  const codeEntry = codes.find(c => c.rewardId === rewardId && !c.used);
  if (!codeEntry) return res.status(400).json({ error: 'no codes left' });
  codeEntry.used = true;
  codeEntry.usedBy = phone;
  codeEntry.usedAt = new Date().toISOString();
  user.redeemed[rewardId] = codeEntry.code;
  user.points = (user.points || 0) - cost;
  writeJSON(usersPath, users);
  writeJSON(codesPath, codes);
  res.json({ status: 'ok', code: codeEntry.code, points: user.points });
});

// Logs endpoints
app.get('/api/logs', (req, res) => {
  res.json(readJSON(logsPath));
});
app.post('/api/logs', (req, res) => {
  const { userId: phone, rewardType } = req.body;
  const eligibility = canSpin(phone);
  if (!eligibility.canSpin) {
    return res.status(429).json({ error: 'limit reached', nextSpin: eligibility.nextSpin.toISOString() });
  }
  const logs = readJSON(logsPath);
  const users = readJSON(usersPath);
  logs.push({ userId: phone, userName: users[phone]?.name || '', rewardType, timestamp: new Date().toISOString() });
  writeJSON(logsPath, logs);

  const config = readJSON(configPath);
  const seg = config.rewardSegments.find(s => s.label === rewardType);
  const value = seg?.value || 0;
  const user = users[phone] || { name: '', password: '', points: 0 };
  user.points = (user.points || 0) + value;
  users[phone] = user;
  writeJSON(usersPath, users);

  res.json({ status: 'logged', points: user.points });
});

// User balance
app.get('/api/users/:phone', (req, res) => {
  const users = readJSON(usersPath);
  const phone = req.params.phone;
  const user = users[phone];
  res.json({ phone, name: user?.name || null, points: user?.points || 0 });
});

// User reward history
app.get('/api/users/:phone/logs', (req, res) => {
  const phone = req.params.phone;
  const logs = readJSON(logsPath).filter(l => l.userId === phone);
  const history = logs.map(l => ({ rewardType: l.rewardType, timestamp: l.timestamp }));
  res.json(history);
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const users = readJSON(usersPath);
  const board = Object.values(users)
    .map(u => ({ name: u.name, points: u.points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
  res.json(board);
});

// Reports
app.get('/api/reports/reward-distribution', (req, res) => {
  res.json(readJSON(logsPath));
});
app.get('/api/reports/summary', (req, res) => {
  const logs = readJSON(logsPath);
  const totalSpins = logs.length;
  const users = new Set(logs.map(l => l.userId));
  const perHour = {};
  logs.forEach(l => {
    const hour = new Date(l.timestamp).getHours();
    perHour[hour] = (perHour[hour] || 0) + 1;
  });
  const peakHour = Object.entries(perHour).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  res.json({ totalSpins, uniqueUsers: users.size, peakHour });
});
app.get('/api/reports/export', (req, res) => {
  const { type } = req.query;
  if (type === 'reward') {
    const logs = readJSON(logsPath);
    let csv = 'userId,rewardType,timestamp\n';
    logs.forEach(l => {
      csv += `${l.userId},${l.rewardType},${l.timestamp}\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('reward-distribution.csv');
    return res.send(csv);
  }
  if (type === 'summary') {
    const logs = readJSON(logsPath);
    const totalSpins = logs.length;
    const users = new Set(logs.map(l => l.userId));
    const csv = `totalSpins,uniqueUsers\n${totalSpins},${users.size}\n`;
    res.header('Content-Type', 'text/csv');
    res.attachment('summary.csv');
    return res.send(csv);
  }
  res.status(400).json({ error: 'unknown type' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
