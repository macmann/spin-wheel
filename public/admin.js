const enabledEl = document.getElementById('enabled');
const resetEl = document.getElementById('resetTime');
const spinsEl = document.getElementById('spinsPerInterval');
const intervalEl = document.getElementById('intervalHours');
const segTable = document.getElementById('segments-table').querySelector('tbody');
const logsTable = document.getElementById('logs-table').querySelector('tbody');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
let logoData = '';
const rewardList = document.getElementById('rewardList');
const newRewardName = document.getElementById('newRewardName');
const createRewardBtn = document.getElementById('createReward');
const couponSection = document.getElementById('coupon-section');
const couponTitle = document.getElementById('couponTitle');
const couponCategory = document.getElementById('couponCategory');
const codeInputs = document.getElementById('codeInputs');
const addCodeInputBtn = document.getElementById('addCodeInput');
const saveCodesBtn = document.getElementById('saveCodes');
const codesTable = document.getElementById('codesTable').querySelector('tbody');
let currentRewardId = null;

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

loadConfig();
loadLogs();

async function loadRewards() {
  const res = await fetch('/api/rewards');
  const rewards = await res.json();
  rewardList.innerHTML = '';
  rewards.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r.name + ' ';
    const btn = document.createElement('button');
    btn.textContent = 'Manage Coupons';
    btn.addEventListener('click', () => openCoupons(r.id, r.name));
    li.appendChild(btn);
    rewardList.appendChild(li);
  });
}

async function createReward() {
  const name = newRewardName.value.trim();
  if (!name) return;
  await fetch('/api/rewards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  newRewardName.value = '';
  loadRewards();
}

function addCodeInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'code-input';
  input.placeholder = 'Coupon code';
  codeInputs.appendChild(input);
}

async function saveCodes() {
  if (!currentRewardId) return;
  const codes = Array.from(codeInputs.querySelectorAll('.code-input'))
    .map(i => i.value.trim())
    .filter(Boolean);
  if (codes.length === 0) return;
  await fetch(`/api/rewards/${currentRewardId}/codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: couponCategory.value, codes })
  });
  codeInputs.innerHTML = '<input type="text" class="code-input" placeholder="Coupon code" />';
  loadCodes();
}

async function loadCodes() {
  if (!currentRewardId) return;
  const res = await fetch(`/api/rewards/${currentRewardId}/codes`);
  const codes = await res.json();
  codesTable.innerHTML = '';
  codes.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.code}</td><td>${c.category}</td><td>${c.used ? 'Yes' : 'No'}</td><td>${c.usedBy || ''}</td><td>${c.usedAt || ''}</td>`;
    const actionTd = document.createElement('td');
    if (!c.used) {
      const btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.addEventListener('click', async () => {
        await fetch(`/api/codes/${c.id}`, { method: 'DELETE' });
        loadCodes();
      });
      actionTd.appendChild(btn);
    }
    tr.appendChild(actionTd);
    codesTable.appendChild(tr);
  });
}

function openCoupons(id, name) {
  currentRewardId = id;
  couponTitle.textContent = `Coupons for ${name}`;
  couponSection.style.display = 'block';
  codeInputs.innerHTML = '<input type="text" class="code-input" placeholder="Coupon code" />';
  loadCodes();
}

createRewardBtn.addEventListener('click', createReward);
addCodeInputBtn.addEventListener('click', addCodeInput);
saveCodesBtn.addEventListener('click', saveCodes);

loadRewards();
