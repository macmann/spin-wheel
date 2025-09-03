const form = document.getElementById('segments-form');
const stored = JSON.parse(localStorage.getItem('segments')) || Array.from({ length: 10 }, (_, i) => `Segment ${i + 1}`);

stored.forEach((seg, idx) => {
  const label = document.createElement('label');
  label.textContent = `Segment ${idx + 1}`;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = seg;
  label.appendChild(input);
  form.appendChild(label);
});

document.getElementById('save').addEventListener('click', () => {
  const inputs = form.querySelectorAll('input');
  const segments = Array.from(inputs).map((el, i) => el.value || `Segment ${i + 1}`);
  localStorage.setItem('segments', JSON.stringify(segments));
  alert('Segments saved!');
});
