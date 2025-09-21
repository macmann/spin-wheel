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
  if (!rewards.length) {
    const empty = document.createElement('p');
    empty.className = 'form-note';
    empty.textContent = 'No rewards are currently available. Check back soon for new offers.';
    rewardsEl.appendChild(empty);
    return;
  }

  rewards.forEach((reward) => {
    const container = document.createElement('article');
    container.className = 'reward';

    const title = document.createElement('strong');
    title.textContent = reward.name;

    const cost = document.createElement('span');
    cost.className = 'muted';
    cost.textContent = `Cost: ${reward.cost} pts`;

    const availability = document.createElement('span');
    availability.className = 'muted';
    availability.textContent = `Available: ${reward.available}`;

    container.append(title, cost, availability);

    if (reward.categories && reward.categories.length) {
      const label = document.createElement('label');
      label.textContent = 'Category';

      const select = document.createElement('select');
      select.className = 'category-select';
      reward.categories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.append(option);
      });

      label.append(select);
      container.append(label);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = String(reward.id);
    button.className = 'btn btn-primary btn-small';
    button.textContent = 'Redeem';

    if (reward.available === 0 || userPoints < reward.cost) {
      button.disabled = true;
    }

    container.append(button);
    rewardsEl.append(container);
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

