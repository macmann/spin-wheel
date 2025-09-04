let config;
let segments = [];

function getUserName() {
  const stored = localStorage.getItem('userName');
  if (stored) return stored;
  let name = '';
  while (!name) {
    name = prompt('Enter your name');
    if (name === null) name = '';
    name = name.trim();
  }
  localStorage.setItem('userName', name);
  return name;
}

const userId = getUserName();
const balanceEl = document.getElementById('balance');
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const size = canvas.width;
const center = size / 2;
const radius = center;
const colors = ['#f3e5f5', '#ffffff'];

async function loadConfig() {
  const res = await fetch('/api/config');
  config = await res.json();
  segments = config.rewardSegments.map(s => s.label);
  const logoImg = document.getElementById('hub-logo');
  if (config.logo) {
    logoImg.src = config.logo;
  } else {
    logoImg.style.display = 'none';
  }
  drawWheel();
}

async function loadUser() {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
  const data = await res.json();
  balanceEl.textContent = `Balance: ${data.points}`;
}

function drawWheel() {
  if (!segments.length) return;
  const angle = (2 * Math.PI) / segments.length;
  segments.forEach((seg, i) => {
    const start = i * angle;
    const end = start + angle;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % 2];
    ctx.fill();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + angle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    ctx.fillText(seg, radius - 10, 5);
    ctx.restore();
  });
}

function pickSegment() {
  const rand = Math.random();
  let sum = 0;
  for (let i = 0; i < config.rewardSegments.length; i++) {
    sum += config.rewardSegments[i].probability;
    if (rand < sum) return i;
  }
  return config.rewardSegments.length - 1;
}

const spinBtn = document.getElementById('spin');
spinBtn.addEventListener('click', () => {
  if (!config.enabled) {
    alert('Daily spin is disabled');
    return;
  }
  const idx = pickSegment();
  const step = 360 / segments.length;
  const deg = 3600 + 270 - (idx * step + step / 2);
  canvas.style.transition = 'transform 4s ease-out';
  canvas.style.transform = `rotate(${deg}deg)`;
  canvas.addEventListener('transitionend', () => {
    canvas.style.transition = 'none';
    canvas.style.transform = `rotate(${deg % 360}deg)`;
    const seg = config.rewardSegments[idx];
    alert(`You won ${seg.label}`);
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rewardType: seg.label })
    })
      .then(r => r.json())
      .then(d => {
        balanceEl.textContent = `Balance: ${d.points}`;
      });
  }, { once: true });
});

loadConfig();
loadUser();
