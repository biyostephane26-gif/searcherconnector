// =================================================================
// SOUMISSION RÉELLE DE CANDIDATURE — Greenhouse / Lever
// =================================================================
// Ni Greenhouse ni Lever n'exposent d'API de soumission publique (elle
// exige la clé privée de CHAQUE entreprise employeuse — inaccessible à
// un tiers). La seule voie légitime : remplir le VRAI formulaire web
// public (celui qu'un humain remplirait à la main), via un navigateur
// automatisé. Aucun compte requis, aucune protection contournée — ces
// pages sont conçues pour être soumises par n'importe quel candidat.
//
// playwright-core (déjà présent via @playwright/test) + l'image Docker
// de base mcr.microsoft.com/playwright:v1.49.0-jammy qui embarque déjà
// les navigateurs — aucune dépendance supplémentaire à installer.
// =================================================================

import { chromium, Browser, Page } from 'playwright-core';

export type AtsPlatform = 'greenhouse' | 'lever';

export function detectAtsPlatform(url: string): AtsPlatform | null {
  try {
    const host = new URL(url).hostname;
    if (host.includes('greenhouse.io')) return 'greenhouse';
    if (host.includes('lever.co')) return 'lever';
    return null;
  } catch { return null; }
}

export interface AtsSubmitInput {
  applyUrl: string;
  fullName: string;
  email: string;
  phone?: string;
  coverMessage: string;
  cvUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export interface AtsSubmitResult {
  success: boolean;
  confirmation?: string;
  error?: string;
}

const NAV_TIMEOUT = 25000;
const ACTION_TIMEOUT = 8000;

async function downloadFile(url: string): Promise<{ buffer: Buffer; name: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const buffer = Buffer.from(await r.arrayBuffer());
    const name = url.split('/').pop()?.split('?')[0] || 'cv.pdf';
    return { buffer, name };
  } catch { return null; }
}

// Détection basique de CAPTCHA — on abandonne proprement plutôt que
// de tenter de le contourner (hors-scope, contraire aux règles posées).
async function hasCaptcha(page: Page): Promise<boolean> {
  const html = await page.content().catch(() => '');
  return /recaptcha|hcaptcha|cf-turnstile/i.test(html);
}

async function fillCommonFields(page: Page, input: AtsSubmitInput) {
  const [first, ...rest] = input.fullName.trim().split(/\s+/);
  const last = rest.join(' ') || first;

  const tryFill = async (selectors: string[], value?: string) => {
    if (!value) return;
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.fill(value, { timeout: ACTION_TIMEOUT }).catch(() => {});
        return;
      }
    }
  };

  await tryFill(['input[name="first_name"]', 'input[id*="first_name" i]', 'input[autocomplete="given-name"]'], first);
  await tryFill(['input[name="last_name"]', 'input[id*="last_name" i]', 'input[autocomplete="family-name"]'], last);
  await tryFill(['input[type="email"]', 'input[name*="email" i]'], input.email);
  await tryFill(['input[type="tel"]', 'input[name*="phone" i]'], input.phone);
  await tryFill(['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]'], input.linkedinUrl);
  await tryFill(['input[name*="website" i]', 'input[name*="portfolio" i]'], input.portfolioUrl);

  // Champ message / cover letter — la plus grande textarea visible.
  const textareas = page.locator('textarea');
  const count = await textareas.count();
  let target: ReturnType<Page['locator']> | null = null;
  let bestRows = -1;
  for (let i = 0; i < count; i++) {
    const ta = textareas.nth(i);
    if (!(await ta.isVisible().catch(() => false))) continue;
    const rows = parseInt((await ta.getAttribute('rows')) || '0', 10);
    if (rows >= bestRows) { bestRows = rows; target = ta; }
  }
  if (target) await target.fill(input.coverMessage, { timeout: ACTION_TIMEOUT }).catch(() => {});

  // CV — upload si un champ fichier existe et qu'on a un CV disponible.
  if (input.cvUrl) {
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      const file = await downloadFile(input.cvUrl);
      if (file) {
        await fileInput.setInputFiles({ name: file.name, mimeType: 'application/pdf', buffer: file.buffer }).catch(() => {});
      }
    }
  }
}

async function withBrowser<T>(fn: (page: Page, browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT);
    return await fn(page, browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function submitGreenhouseApplication(input: AtsSubmitInput): Promise<AtsSubmitResult> {
  return withBrowser(async (page) => {
    await page.goto(input.applyUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    if (await hasCaptcha(page)) return { success: false, error: 'CAPTCHA détecté — abandon (pas de contournement).' };

    await fillCommonFields(page, input);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitBtn.count() === 0) return { success: false, error: 'Bouton de soumission introuvable.' };
    if (await hasCaptcha(page)) return { success: false, error: 'CAPTCHA détecté avant envoi — abandon.' };

    await submitBtn.click({ timeout: ACTION_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    const confirmed = /thank you|thanks for applying|application (has been )?received|merci|candidature (a été )?(bien )?reçue/i.test(bodyText);
    if (!confirmed) return { success: false, error: 'Pas de confirmation détectée après envoi — le formulaire a peut-être des champs obligatoires non remplis.' };

    return { success: true, confirmation: bodyText.slice(0, 300) };
  });
}

export async function submitLeverApplication(input: AtsSubmitInput): Promise<AtsSubmitResult> {
  return withBrowser(async (page) => {
    await page.goto(input.applyUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    if (await hasCaptcha(page)) return { success: false, error: 'CAPTCHA détecté — abandon (pas de contournement).' };

    // Lever sépare souvent la page offre de la page formulaire ("Apply for this job").
    const applyLink = page.locator('a:has-text("Apply for this job"), a[href*="/apply"]').first();
    if (await applyLink.count() > 0) {
      await applyLink.click({ timeout: ACTION_TIMEOUT }).catch(() => {});
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    await fillCommonFields(page, input);

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.count() === 0) return { success: false, error: 'Bouton de soumission introuvable.' };
    if (await hasCaptcha(page)) return { success: false, error: 'CAPTCHA détecté avant envoi — abandon.' };

    await submitBtn.click({ timeout: ACTION_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    const confirmed = /thank you|thanks for applying|application (has been )?received|merci|candidature (a été )?(bien )?reçue/i.test(bodyText);
    if (!confirmed) return { success: false, error: 'Pas de confirmation détectée après envoi — le formulaire a peut-être des champs obligatoires non remplis.' };

    return { success: true, confirmation: bodyText.slice(0, 300) };
  });
}

export async function submitAtsApplication(platform: AtsPlatform, input: AtsSubmitInput): Promise<AtsSubmitResult> {
  if (platform === 'greenhouse') return submitGreenhouseApplication(input);
  if (platform === 'lever') return submitLeverApplication(input);
  return { success: false, error: 'Plateforme ATS non supportée.' };
}
