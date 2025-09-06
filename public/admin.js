const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const sortSelect = document.getElementById('sort');
const tbody = document.querySelector('#rewardsTable tbody');
const modal = document.getElementById('rewardModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('rewardForm');
const cancelModal = document.getElementById('cancelModal');
const toastEl = document.getElementById('toast');
let rewards = [];
let editingReward = null;

function showToast(msg, error) {
  toastEl.textContent = msg;
  toastEl.style.background = error ? '#c0392b' : '#333';
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function openModal(reward) {
  editingReward = reward || null;
  modal.classList.remove('hidden');
  modalTitle.textContent = reward ? 'Edit Reward' : 'New Reward';
  form.name.value = reward?.name || '';
  form.costPoints.value = reward?.costPoints || '';
  form.description.value = reward?.description || '';
  form.isActive.checked = reward?.isActive ?? true;
  form.displayPriority.value = reward?.displayPriority ?? 10;
  form.dailyRedeemCap.value = reward?.dailyRedeemCap ?? 0;
}

cancelModal.addEventListener('click', () => modal.classList.add('hidden'));

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    name: form.name.value.trim(),
    costPoints: Number(form.costPoints.value),
    description: form.description.value.trim(),
    isActive: form.isActive.checked,
    displayPriority: Number(form.displayPriority.value),
    dailyRedeemCap: Number(form.dailyRedeemCap.value)
  };
  const url = editingReward ? `/rewards/${editingReward.id}` : '/rewards';
  const method = editingReward ? 'PATCH' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (res.ok) {
    modal.classList.add('hidden');
    showToast('Saved');
    await loadRewards();
  } else {
    const err = await res.json();
    showToast(err.message || 'Error', true);
  }
});

function makeEditable(td, reward, field) {
  const type = field === 'name' ? 'text' : 'number';
  const input = document.createElement('input');
  input.type = type;
  input.value = reward[field];
  td.textContent = '';
  td.appendChild(input);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  td.appendChild(saveBtn);
  td.appendChild(cancelBtn);

  saveBtn.addEventListener('click', async () => {
    let value = type === 'text' ? input.value.trim() : Number(input.value);
    if (field === 'name' && !value) { showToast('Name required', true); return; }
    const payload = { [field]: value };
    const res = await fetch(`/rewards/${reward.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      reward[field] = type === 'text' ? value : Number(value);
      showToast('Saved');
      await loadRewards();
    } else {
      const err = await res.json();
      showToast(err.message || 'Error', true);
      await loadRewards();
    }
  });
  cancelBtn.addEventListener('click', () => renderTable());
}

function renderTable() {
  tbody.innerHTML = '';
  let list = [...rewards];
  const q = searchInput.value.toLowerCase();
  if (q) list = list.filter(r => r.name.toLowerCase().includes(q));
  const f = filterSelect.value;
  if (f === 'active') list = list.filter(r => r.isActive);
  if (f === 'inactive') list = list.filter(r => !r.isActive);
  const s = sortSelect.value;
  list.sort((a, b) => {
    if (s === 'name') return a.name.localeCompare(b.name);
    if (s === 'costPoints') return a.costPoints - b.costPoints;
    return a.displayPriority - b.displayPriority;
  });
  for (const r of list) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = r.name;
    nameTd.dataset.label = 'Name';
    nameTd.addEventListener('click', () => makeEditable(nameTd, r, 'name'));
    tr.appendChild(nameTd);

    const costTd = document.createElement('td');
    costTd.textContent = r.costPoints;
    costTd.dataset.label = 'Cost Points';
    costTd.addEventListener('click', () => makeEditable(costTd, r, 'costPoints'));
    tr.appendChild(costTd);

    const activeTd = document.createElement('td');
    activeTd.dataset.label = 'Active';
    const activeChk = document.createElement('input');
    activeChk.type = 'checkbox';
    activeChk.checked = r.isActive;
    activeChk.addEventListener('change', async () => {
      activeChk.disabled = true;
      const res = await fetch(`/rewards/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: activeChk.checked }) });
      if (res.ok) {
        r.isActive = activeChk.checked;
        showToast('Updated');
      } else {
        activeChk.checked = !activeChk.checked;
        showToast('Error', true);
      }
      activeChk.disabled = false;
    });
    activeTd.appendChild(activeChk);
    tr.appendChild(activeTd);

    const priTd = document.createElement('td');
    priTd.textContent = r.displayPriority;
    priTd.dataset.label = 'Priority';
    priTd.addEventListener('click', () => makeEditable(priTd, r, 'displayPriority'));
    tr.appendChild(priTd);

    const capTd = document.createElement('td');
    capTd.textContent = r.dailyRedeemCap;
    capTd.dataset.label = 'Daily Cap';
    capTd.addEventListener('click', () => makeEditable(capTd, r, 'dailyRedeemCap'));
    tr.appendChild(capTd);

    const availTd = document.createElement('td');
    availTd.textContent = r.unusedCodes || 0;
    availTd.dataset.label = 'Available Codes';
    tr.appendChild(availTd);

    const usedTd = document.createElement('td');
    usedTd.textContent = r.usedCodes || 0;
    usedTd.dataset.label = 'Used Codes';
    tr.appendChild(usedTd);

    const actTd = document.createElement('td');
    actTd.dataset.label = 'Actions';
    const manage = document.createElement('a');
    manage.href = `codes.html?rewardId=${r.id}`;
    manage.textContent = 'Manage Codes';
    actTd.appendChild(manage);
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openModal(r));
    actTd.appendChild(editBtn);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this reward?')) return;
      const res = await fetch(`/rewards/${r.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const body = await res.json();
        showToast(body.message || 'Has used codes', true);
      } else if (res.ok) {
        showToast('Deleted');
        await loadRewards();
      } else {
        showToast('Error', true);
      }
    });
    actTd.appendChild(delBtn);
    tr.appendChild(actTd);

    tbody.appendChild(tr);
  }
}

searchInput.addEventListener('input', renderTable);
filterSelect.addEventListener('change', renderTable);
sortSelect.addEventListener('change', renderTable);
document.getElementById('newRewardBtn').addEventListener('click', () => openModal());

async function loadRewards() {
  const res = await fetch('/rewards');
  rewards = await res.json();
  renderTable();
}

loadRewards();
