// =================================================================
// Searcher Connector — assistant de remplissage
// Détecte un formulaire de candidature sur la page, ajoute un bouton
// flottant. Au clic : récupère profil + message via l'API (token perso,
// jamais le mot de passe), remplit les champs détectés. L'utilisateur
// garde TOUJOURS la main sur l'envoi final — ce script ne soumet rien.
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

function injectButton() {
  if (document.getElementById('sc-fill-button')) return;
  const btn = document.createElement('button');
  btn.id = 'sc-fill-button';
  btn.textContent = '🔍 Remplir avec Searcher Connector';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#D4AF37;color:#000;border:none;padding:10px 16px;border-radius:24px;font:bold 12px system-ui;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);';
  btn.addEventListener('click', async () => {
    btn.textContent = '⏳ Chargement...';
    chrome.storage.sync.get(['sc_token'], async (data) => {
      if (!data.sc_token) {
        showToast('Connecte d\'abord ton token via l\'icône de l\'extension.', true);
        btn.textContent = '🔍 Remplir avec Searcher Connector';
        return;
      }
      try {
        const url = `${API_BASE}/api/extension/context?token=${encodeURIComponent(data.sc_token)}&url=${encodeURIComponent(window.location.href)}`;
        const res = await fetch(url);
        const ctx = await res.json();
        if (!res.ok) { showToast(ctx.error || 'Erreur — vérifie ton token.', true); btn.textContent = '🔍 Remplir avec Searcher Connector'; return; }
        const n = fillForm(ctx);
        showToast(n > 0 ? `✓ ${n} champ(s) rempli(s) — relis avant d'envoyer, et attache ton CV si demandé.` : 'Aucun champ reconnu sur cette page.');
      } catch (e) {
        showToast('Impossible de contacter Searcher Connector.', true);
      }
      btn.textContent = '🔍 Remplir avec Searcher Connector';
    });
  });
  document.body.appendChild(btn);
}

if (looksLikeApplicationForm()) injectButton();

// Certains sites (React/Vue) construisent le formulaire après le chargement
// initial — on réessaie sur les mutations du DOM, avec un throttle simple.
let lastCheck = 0;
const observer = new MutationObserver(() => {
  const now = Date.now();
  if (now - lastCheck < 2000) return;
  lastCheck = now;
  if (looksLikeApplicationForm()) injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
