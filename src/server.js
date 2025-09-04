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

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
// Allow larger JSON bodies so base64-encoded logos can be saved
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../public')));

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

// Redemption rewards configuration (admin)
app.get('/api/rewards', (req, res) => {
  res.json(readJSON(rewardsPath));
});
app.post('/api/rewards', (req, res) => {
  writeJSON(rewardsPath, req.body);
  res.json({ status: 'ok' });
});

// User reward listings
app.get('/api/rewards/:phone', (req, res) => {
  const rewards = readJSON(rewardsPath);
  const users = readJSON(usersPath);
  const phone = req.params.phone;
  const user = users[phone] || { redeemed: {} };
  const redeemed = user.redeemed || {};
  const data = rewards.map(r => ({
    id: r.id,
    name: r.name,
    cost: r.cost,
    redeemedCode: redeemed[r.id] || null,
    available: r.codes.length
  }));
  res.json(data);
});

app.post('/api/redeem', (req, res) => {
  const { phone, rewardId } = req.body;
  const rewards = readJSON(rewardsPath);
  const users = readJSON(usersPath);
  const user = users[phone];
  if (!user) return res.status(400).json({ error: 'user not found' });
  user.redeemed = user.redeemed || {};
  if (user.redeemed[rewardId]) return res.status(400).json({ error: 'already redeemed' });
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) return res.status(400).json({ error: 'reward not found' });
  if (user.points < reward.cost) return res.status(400).json({ error: 'not enough points' });
  if (reward.codes.length === 0) return res.status(400).json({ error: 'no codes left' });
  const code = reward.codes.shift();
  user.points -= reward.cost;
  user.redeemed[rewardId] = code;
  writeJSON(usersPath, users);
  writeJSON(rewardsPath, rewards);
  res.json({ status: 'ok', code, points: user.points });
});

// Logs endpoints
app.get('/api/logs', (req, res) => {
  res.json(readJSON(logsPath));
});
app.post('/api/logs', (req, res) => {
  const logs = readJSON(logsPath);
  const { userId: phone, rewardType } = req.body;
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
