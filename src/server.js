import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const configPath = path.join(dataDir, 'config.json');
const logsPath = path.join(dataDir, 'logs.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
  logs.push({ ...req.body, timestamp: new Date().toISOString() });
  writeJSON(logsPath, logs);
  res.json({ status: 'logged' });
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
