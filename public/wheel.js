const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const size = canvas.width;
const center = size / 2;
const radius = center;

const defaultSegments = Array.from({ length: 10 }, (_, i) => `Segment ${i + 1}`);
let segments = JSON.parse(localStorage.getItem('segments')) || defaultSegments;

const colors = ['#f3e5f5', '#ffffff'];

function drawWheel() {
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

drawWheel();

const spinBtn = document.getElementById('spin');
spinBtn.addEventListener('click', () => {
  const deg = 3600 + Math.random() * 360;
  canvas.style.transition = 'transform 4s ease-out';
  canvas.style.transform = `rotate(${deg}deg)`;
  canvas.addEventListener('transitionend', () => {
    canvas.style.transition = 'none';
    canvas.style.transform = `rotate(${deg % 360}deg)`;
  }, { once: true });
});
