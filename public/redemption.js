function getUser() {
  const name = localStorage.getItem('userName');
  const phone = localStorage.getItem('userPhone');
  if (!name || !phone) {
    window.location.href = 'login.html';
    return { name: '', phone: '' };
  }
  return { name, phone };
}

const user = getUser();
const phone = user.phone;
const pointsEl = document.getElementById('userPoints');
const rewardsEl = document.getElementById('rewards');
let userPoints = 0;

async function loadPoints() {
  const res = await fetch(`/api/users/${phone}`);
  const data = await res.json();
  userPoints = data.points;
  pointsEl.textContent = 'Points: ' + userPoints;
}

function renderRewards(rewards) {
  rewardsEl.innerHTML = '';
  rewards.forEach(r => {
    const div = document.createElement('div');
    div.className = 'reward';
    let html = `<strong>${r.name}</strong> - ${r.cost} pts`;
    const disabled = r.available === 0 || userPoints < r.cost ? 'disabled' : '';
    html += `<p>Available: ${r.available}</p>`;
    if (r.categories && r.categories.length) {
      html += '<label>Category: <select class="category-select">';
      html += r.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
      html += '</select></label>';
    }
    html += `<button data-id="${r.id}" ${disabled}>Redeem</button>`;
    div.innerHTML = html;
    rewardsEl.appendChild(div);
  });
}

async function loadRewards() {
  const res = await fetch(`/api/rewards/${phone}`);
  const data = await res.json();
  renderRewards(data);
}

async function refresh() {
  await loadPoints();
  await loadRewards();
}

rewardsEl.addEventListener('click', async e => {
  if (e.target.tagName === 'BUTTON') {
    const id = Number(e.target.getAttribute('data-id'));
    const container = e.target.closest('.reward');
    const select = container.querySelector('.category-select');
    const category = select ? select.value : '';
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, rewardId: id, category })
    });
    const data = await res.json();
    if (data.code) {
      alert('Your code: ' + data.code);
      await refresh();
    } else if (data.error) {
      alert(data.error);
    }
  }
});

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'experience.html';
});
refresh();

