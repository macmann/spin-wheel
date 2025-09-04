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
  users[phone] = { name, password: hash, points: 0 };
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
