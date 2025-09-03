const tbody = document.querySelector('#board tbody');
async function loadBoard() {
  const res = await fetch('/api/leaderboard');
  const board = await res.json();
  tbody.innerHTML = '';
  board.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.userId}</td><td>${row.points}</td>`;
    tbody.appendChild(tr);
  });
}
loadBoard();
