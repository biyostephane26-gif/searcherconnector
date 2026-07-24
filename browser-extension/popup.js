const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['sc_token'], (data) => {
  if (data.sc_token) {
    tokenInput.value = data.sc_token;
    statusEl.textContent = '✓ Connecté';
    statusEl.className = 'status ok';
  }
});

document.getElementById('save').addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.textContent = 'Colle ton token d\'abord.';
    statusEl.className = 'status off';
    return;
  }
  chrome.storage.sync.set({ sc_token: token }, () => {
    statusEl.textContent = '✓ Connecté — va sur une page de candidature.';
    statusEl.className = 'status ok';
  });
});
