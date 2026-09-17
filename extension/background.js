// =================================================================
// SCAI Autofill — service worker
// Fait l'appel réseau vers Searcher Connector À LA PLACE du content
// script. Un content script s'exécute dans le contexte de la PAGE
// hôte : sur certains sites (Upwork notamment) une politique de
// sécurité stricte (CSP) bloque ses requêtes fetch() sortantes, même
// avec host_permissions accordées dans le manifest. Un service worker
// n'est jamais soumis à la CSP d'une page — il tourne dans le contexte
// propre de l'extension, jamais dans celui du site visité.
// =================================================================

const API_BASE = 'https://searcherconnector.onrender.com';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SC_FETCH_CONTEXT') {
    (async () => {
      try {
        const url = `${API_BASE}/api/extension/context?token=${encodeURIComponent(msg.token)}&url=${encodeURIComponent(msg.pageUrl)}`;
        const res = await fetch(url);
        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true; // réponse asynchrone
  }

  if (msg?.type === 'SC_FETCH_LISTING_CONFIGS') {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/extension/listing-configs`);
        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }

  if (msg?.type === 'SC_SUBMIT_LISTINGS') {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/extension/submit-listings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: msg.token, platform: msg.platform, items: msg.items }),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
});
