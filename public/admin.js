const enabledEl = document.getElementById('enabled');
const resetEl = document.getElementById('resetTime');
const spinsEl = document.getElementById('spinsPerInterval');
const intervalEl = document.getElementById('intervalHours');
const segTable = document.getElementById('segments-table').querySelector('tbody');
const logsTable = document.getElementById('logs-table').querySelector('tbody');
const redeemTable = document.getElementById('redeem-table').querySelector('tbody');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
let logoData = '';
let rewardCounter = 1;

function formatCodes(codes = []) {
  return (codes || []).map(c => `${c.code}:${c.amount}`).join(',');
}

function parseCodes(str, existing = []) {
  return str
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const [code, amtStr] = pair.split(':').map(t => t.trim());
      const prev = existing.find(c => c.code === code);
      return {
        code,
        amount: Number(amtStr) || 0,
        redeemed: prev ? prev.redeemed || 0 : 0
      };
    });
}

function computeAvailability(codes = []) {
  return codes.reduce(
    (sum, c) => sum + Math.max(0, (c.amount || 0) - (c.redeemed || 0)),
    0
  );
}

function addRow(seg = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${seg.label || ''}" /></td>
    <td><input type="number" value="${seg.value || 0}" /></td>
    <td><input type="number" step="0.01" value="${seg.probability || 0}" /></td>
    <td><input type="number" value="${seg.dailyCap || 0}" /></td>
    <td><button type="button" class="delete-segment">Delete</button></td>`;
  tr.querySelector('.delete-segment').addEventListener('click', () => {
    tr.remove();
  });
  segTable.appendChild(tr);
}

function addRewardRow(r = {}) {
  const tr = document.createElement('tr');
  tr.dataset.id = r.id || rewardCounter++;
  tr.dataset.codes = JSON.stringify(r.codes || []);
  tr.innerHTML = `
    <td><input type="text" value="${r.name || ''}" /></td>
    <td><input type="number" value="${r.cost || 0}" /></td>
    <td><input type="text" class="codes-input" value="${formatCodes(r.codes)}" /></td>
    <td class="availability"></td>
    <td><button type="button" class="delete-reward">Delete</button></td>`;
  const codesInput = tr.querySelector('.codes-input');
  const availabilityCell = tr.querySelector('.availability');
  function updateAvailability() {
    const existing = JSON.parse(tr.dataset.codes || '[]');
    const codes = parseCodes(codesInput.value, existing);
    availabilityCell.textContent = computeAvailability(codes);
  }
  codesInput.addEventListener('input', updateAvailability);
  updateAvailability();
  tr.querySelector('.delete-reward').addEventListener('click', () => {
    tr.remove();
  });
  redeemTable.appendChild(tr);
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  enabledEl.checked = cfg.enabled;
  resetEl.value = cfg.resetTime;
  spinsEl.value = cfg.spinsPerInterval || 1;
  intervalEl.value = cfg.intervalHours || 24;
  logoData = cfg.logo || '';
  if (logoData) {
    logoPreview.src = logoData;
    logoPreview.style.display = 'block';
  }
  segTable.innerHTML = '';
  (cfg.rewardSegments || []).forEach(s => addRow(s));
}

async function loadRewards() {
  const res = await fetch('/api/rewards');
  const rewards = await res.json();
  redeemTable.innerHTML = '';
  rewardCounter = 1;
  rewards.forEach(r => {
    rewardCounter = Math.max(rewardCounter, (r.id || 0) + 1);
    addRewardRow(r);
  });
}

async function loadLogs() {
  const res = await fetch('/api/logs');
  const logs = await res.json();
  logsTable.innerHTML = '';
  logs.forEach(l => {
    const tr = document.createElement('tr');
    const name = l.userName || l.userId;
    tr.innerHTML = `<td>${name}</td><td>${l.rewardType}</td><td>${l.timestamp}</td>`;
    logsTable.appendChild(tr);
  });
}

document.getElementById('add-segment').addEventListener('click', () => addRow());
document.getElementById('add-reward').addEventListener('click', () => addRewardRow());

logoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logoData = ev.target.result;
    logoPreview.src = logoData;
    logoPreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

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
    spinsPerInterval: Number(spinsEl.value),
    intervalHours: Number(intervalEl.value),
    rewardSegments,
    logo: logoData
  };
  await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  alert('Config saved');
});

document.getElementById('save-rewards').addEventListener('click', async () => {
  const rows = Array.from(redeemTable.querySelectorAll('tr'));
  const rewards = rows.map(r => {
    const inputs = r.querySelectorAll('input');
    const existing = JSON.parse(r.dataset.codes || '[]');
    const codes = parseCodes(inputs[2].value, existing);
    r.dataset.codes = JSON.stringify(codes);
    return {
      id: Number(r.dataset.id),
      name: inputs[0].value,
      cost: Number(inputs[1].value),
      codes
    };
  });
  await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rewards) });
  alert('Rewards saved');
});

loadConfig();
loadLogs();
loadRewards();
