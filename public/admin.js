const enabledEl = document.getElementById('enabled');
const resetEl = document.getElementById('resetTime');
const segTable = document.getElementById('segments-table').querySelector('tbody');
const logsTable = document.getElementById('logs-table').querySelector('tbody');

function addRow(seg = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${seg.label || ''}" /></td>
    <td><input type="number" value="${seg.value || 0}" /></td>
    <td><input type="number" step="0.01" value="${seg.probability || 0}" /></td>
    <td><input type="number" value="${seg.dailyCap || 0}" /></td>`;
  segTable.appendChild(tr);
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  enabledEl.checked = cfg.enabled;
  resetEl.value = cfg.resetTime;
  segTable.innerHTML = '';
  (cfg.rewardSegments || []).forEach(s => addRow(s));
}

async function loadLogs() {
  const res = await fetch('/api/logs');
  const logs = await res.json();
  logsTable.innerHTML = '';
  logs.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.userId}</td><td>${l.rewardType}</td><td>${l.timestamp}</td>`;
    logsTable.appendChild(tr);
  });
}

document.getElementById('add-segment').addEventListener('click', () => addRow());

document.getElementById('save-config').addEventListener('click', async () => {
  const rows = Array.from(segTable.querySelectorAll('tr'));
  const rewardSegments = rows.map(r => {
    const inputs = r.querySelectorAll('input');
    return {
      label: inputs[0].value,
      value: Number(inputs[1].value),
      probability: Number(inputs[2].value),
      dailyCap: Number(inputs[3].value)
    };
  });
  const body = {
    enabled: enabledEl.checked,
    resetTime: resetEl.value,
    rewardSegments
  };
  await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  alert('Config saved');
});

loadConfig();
loadLogs();
