// =================================================================
// Searcher Connector — assistant de remplissage
// Détecte un formulaire de candidature sur la page et se remplit TOUT
// SEUL dès le chargement — plus besoin de cliquer pour déclencher le
// remplissage. Le bouton flottant sert juste à relancer manuellement
// (formulaire chargé en retard, changement de champ, etc.).
// Sur les ATS reconnus (Greenhouse/Lever), si l'option "soumission
// autonome" est activée dans le popup, l'envoi se fait aussi tout seul.
// Partout ailleurs, le clic final d'envoi reste TOUJOURS humain — ce
// script ne soumet jamais rien hors de ce cas précis.
// =================================================================

const API_BASE = 'https://searcherconnector.onrender.com';

function looksLikeApplicationForm() {
  const hasEmailInput = !!document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
  const hasTextarea = document.querySelectorAll('textarea').length > 0;
  const hasFileInput = !!document.querySelector('input[type="file"]');
  return hasEmailInput || hasTextarea || hasFileInput;
}

function fieldLabelText(el) {
  let text = (el.getAttribute('name') || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('placeholder') || '') + ' ' + (el.getAttribute('aria-label') || '');
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) text += ' ' + label.textContent;
  }
  const parentLabel = el.closest('label');
  if (parentLabel) text += ' ' + parentLabel.textContent;
  return text.toLowerCase();
}

function matchesAny(text, keywords) {
  return keywords.some(k => text.includes(k));
}

const FIELD_PATTERNS = {
  email:      ['email', 'e-mail', 'courriel'],
  full_name:  ['full name', 'fullname', 'nom complet', 'your name'],
  first_name: ['first name', 'firstname', 'prénom', 'prenom'],
  last_name:  ['last name', 'lastname', 'surname', 'nom de famille'],
  phone:      ['phone', 'tel', 'téléphone', 'telephone', 'mobile', 'whatsapp'],
  portfolio:  ['portfolio', 'website', 'site web'],
  github:     ['github'],
  linkedin:   ['linkedin'],
  message:    ['cover letter', 'cover_letter', 'motivation', 'message', 'why', 'pourquoi', 'proposal', 'lettre'],
};

function setValue(el, value) {
  if (!value) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function fillForm(data) {
  let filledCount = 0;
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type])');
  inputs.forEach(el => {
    if (el.value) return; // ne jamais écraser une valeur déjà saisie
    const text = fieldLabelText(el);
    if (matchesAny(text, FIELD_PATTERNS.email) && setValue(el, data.email)) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.full_name) && setValue(el, data.full_name)) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.first_name) && setValue(el, (data.full_name || '').split(' ')[0])) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.last_name) && setValue(el, (data.full_name || '').split(' ').slice(1).join(' '))) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.phone) && setValue(el, data.phone)) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.github) && setValue(el, data.github_url)) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.linkedin) && setValue(el, data.linkedin_url)) { filledCount++; return; }
    if (matchesAny(text, FIELD_PATTERNS.portfolio) && setValue(el, data.portfolio_url)) { filledCount++; return; }
  });

  // Textarea la plus pertinente pour le message — priorité à celle dont
  // le label matche "cover letter/motivation/message", sinon la plus grande.
  const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.value);
  if (textareas.length > 0) {
    let target = textareas.find(t => matchesAny(fieldLabelText(t), FIELD_PATTERNS.message));
    if (!target) target = textareas.sort((a, b) => (b.rows || 0) - (a.rows || 0))[0];
    if (setValue(target, data.message)) filledCount++;
  }

  return filledCount;
}

function showToast(text, isError) {
  const toast = document.createElement('div');
  toast.textContent = text;
  toast.style.cssText = `position:fixed;bottom:80px;right:20px;z-index:2147483647;background:${isError ? '#7f1d1d' : '#111'};color:#fff;border:1px solid ${isError ? '#f87171' : '#D4AF37'};padding:10px 16px;border-radius:8px;font:13px system-ui;box-shadow:0 4px 12px rgba(0,0,0,.4);max-width:280px;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

const BTN_LABEL = `
  <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid #D4AF37;flex-shrink:0;">
    <span style="width:6px;height:6px;border-radius:50%;background:#D4AF37;"></span>
  </span>
  <span>Remplir avec Searcher</span>
`;

let sharedBtn = null;

async function runFill(triggeredManually) {
  if (!sharedBtn) return;
  const setLabel = (text) => { sharedBtn.innerHTML = ''; const span = document.createElement('span'); span.textContent = text; sharedBtn.appendChild(span); };
  setLabel('⏳ Chargement...');

  chrome.storage.sync.get(['sc_token', 'sc_auto_submit'], async (data) => {
    if (!data.sc_token) {
      if (triggeredManually) showToast('Connecte d\'abord ton token via l\'icône de l\'extension.', true);
      sharedBtn.innerHTML = BTN_LABEL;
      return;
    }
    try {
      const url = `${API_BASE}/api/extension/context?token=${encodeURIComponent(data.sc_token)}&url=${encodeURIComponent(window.location.href)}`;
      const res = await fetch(url);
      const ctx = await res.json();
      if (!res.ok) { showToast(ctx.error || 'Erreur — vérifie ton token.', true); sharedBtn.innerHTML = BTN_LABEL; return; }
      const n = fillForm(ctx);

      // Auto-soumission — seulement si l'utilisateur l'a activée ET que
      // le serveur confirme que cette page est un ATS reconnu
      // (Greenhouse/Lever). Sur toute autre page (LinkedIn, Upwork,
      // Freelancer, site maison...), le clic final reste TOUJOURS humain
      // — ces plateformes interdisent la soumission automatisée dans
      // leurs conditions d'utilisation, script ou pas.
      if (data.sc_auto_submit && ctx.autoSubmitAllowed && n > 0) {
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          await new Promise(r => setTimeout(r, 600));
          submitBtn.click();
          showToast(`✓ ${n} champ(s) rempli(s) — candidature envoyée automatiquement (ATS reconnu).`);
        } else {
          showToast(`✓ ${n} champ(s) rempli(s) — bouton d'envoi introuvable, termine toi-même.`, true);
        }
      } else if (n > 0) {
        showToast(`✓ ${n} champ(s) rempli(s) automatiquement — relis avant d'envoyer, et attache ton CV si demandé.`);
      } else if (triggeredManually) {
        showToast('Aucun champ reconnu sur cette page.');
      }
    } catch (e) {
      if (triggeredManually) showToast('Impossible de contacter Searcher Connector.', true);
    }
    sharedBtn.innerHTML = BTN_LABEL;
  });
}

function injectButton() {
  if (document.getElementById('sc-fill-button')) return;
  const btn = document.createElement('button');
  btn.id = 'sc-fill-button';
  btn.innerHTML = BTN_LABEL;
  btn.title = 'Se remplit déjà tout seul — clique pour relancer manuellement';
  btn.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:2147483647;
    display:flex;align-items:center;gap:8px;
    background:#0D0D0D;color:#D4AF37;border:1px solid rgba(212,175,55,.4);
    padding:11px 18px;border-radius:999px;
    font:600 12.5px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
    letter-spacing:.02em;cursor:pointer;
    box-shadow:0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(212,175,55,.08);
    transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  `;
  btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 12px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(212,175,55,.25), 0 0 20px rgba(212,175,55,.15)'; btn.style.borderColor = 'rgba(212,175,55,.8)'; };
  btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; btn.style.boxShadow = '0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(212,175,55,.08)'; btn.style.borderColor = 'rgba(212,175,55,.4)'; };
  btn.addEventListener('click', () => runFill(true));
  document.body.appendChild(btn);
  sharedBtn = btn;
}

// =================================================================
// Lecture de pages de résultats — plateformes verrouillées derrière
// connexion (Comet, Crème de la Crème, etc.) où AUCUN serveur ne peut
// scraper de contenu (vérifié un par un le 2026-07-27 : ni RSS, ni API,
// ni sitemap). L'extension lit la page déjà rendue dans LA SESSION DE
// L'UTILISATEUR — jamais de mot de passe géré par Searcher Connector,
// chaque utilisateur reste responsable de son propre compte.
// Les sélecteurs viennent du serveur (listing-configs), pas figés ici,
// pour pouvoir ajouter des plateformes sans republier l'extension.
// =================================================================
let listingReadOnce = false;

function extractListingItems(cfg) {
  const items = [];
  document.querySelectorAll(cfg.itemSelector).forEach(card => {
    const titleEl = cfg.titleSelector ? card.querySelector(cfg.titleSelector) : card;
    const linkEl = cfg.linkSelector ? card.querySelector(cfg.linkSelector) : card;
    const dateEl = cfg.dateSelector ? card.querySelector(cfg.dateSelector) : null;
    const title = (titleEl?.textContent || '').trim();
    const link = linkEl?.href || (linkEl?.getAttribute && linkEl.getAttribute('href')) || '';
    if (!title || !link) return;
    items.push({
      title: title.slice(0, 200),
      link: link.startsWith('http') ? link : new URL(link, location.origin).href,
      date: (dateEl?.textContent || dateEl?.getAttribute?.('datetime') || '').trim(),
    });
  });
  return items;
}

async function tryReadListings() {
  if (listingReadOnce) return;
  chrome.storage.sync.get(['sc_token'], async (data) => {
    if (!data.sc_token) return;
    try {
      const cfgRes = await fetch(`${API_BASE}/api/extension/listing-configs`);
      const { configs } = await cfgRes.json();
      const cfg = (configs || []).find(c => { try { return new RegExp(c.listingUrlPattern, 'i').test(location.href); } catch { return false; } });
      if (!cfg) return;

      const items = extractListingItems(cfg);
      if (items.length === 0) return;
      listingReadOnce = true;

      const res = await fetch(`${API_BASE}/api/extension/submit-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.sc_token, platform: cfg.platform, items }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.inserted > 0) {
        showToast(`✓ ${out.inserted} mission(s) partagée(s) avec Searcher Connector depuis ${cfg.platform}.`);
      }
    } catch { /* silencieux — ne jamais gêner la navigation de l'utilisateur */ }
  });
}

let autoFilledOnce = false;

if (looksLikeApplicationForm()) {
  injectButton();
  autoFilledOnce = true;
  runFill(false);
}
tryReadListings();

// Certains sites (React/Vue) construisent le formulaire après le chargement
// initial — on réessaie sur les mutations du DOM, avec un throttle simple.
// Le remplissage auto ne se déclenche qu'UNE fois par page (autoFilledOnce) ;
// le bouton reste disponible ensuite pour un déclenchement manuel.
let lastCheck = 0;
const observer = new MutationObserver(() => {
  const now = Date.now();
  if (now - lastCheck < 2000) return;
  lastCheck = now;
  if (looksLikeApplicationForm()) {
    injectButton();
    if (!autoFilledOnce) { autoFilledOnce = true; runFill(false); }
  }
  if (!listingReadOnce) tryReadListings();
});
observer.observe(document.body, { childList: true, subtree: true });
