// =================================================================
// LECTURE PROGRAMMÉE DES PLATEFORMES VERROUILLÉES (comptes du fondateur)
// =================================================================
// Playwright se connecte avec les identifiants stockés dans
// platform_credentials (chiffrés, voir credentialCrypto.ts), navigue
// vers la page de missions, et remonte les items trouvés dans
// cache_opportunities — exactement comme le reste du pipeline de scan,
// mais pour des plateformes qu'aucun serveur ne peut atteindre sans
// session authentifiée (ni RSS, ni API, ni sitemap — confirmé le
// 2026-07-27).
//
// Distinct de atsSubmit.ts (soumission de candidature) : ici on ne fait
// que LIRE une liste de résultats, jamais remplir ni envoyer de
// formulaire de candidature.
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { decryptCredential } from './credentialCrypto';
import { normalizeMissionKey } from './missionFreshness';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Selectors {
  login: { user: string; pass: string; submit: string };
  listing: { item: string; title: string; link: string; date?: string };
}

interface CredentialRow {
  id: string;
  platform_name: string;
  login_url: string;
  listing_url: string;
  username: string;
  password_encrypted: string;
  selectors: Selectors;
  status: string;
}

function fingerprintOf(title: string, source: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${title}::${source}::${day}`.slice(0, 400);
}

async function scrapeOnePlatform(cred: CredentialRow, log: string[]): Promise<{ ok: boolean; count: number; error?: string }> {
  const sel = cred.selectors;
  if (!sel?.login?.user || !sel?.listing?.item) {
    return { ok: false, count: 0, error: 'Sélecteurs incomplets — config non finalisée' };
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    });

    // ── Connexion ──
    await page.goto(cred.login_url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const password = decryptCredential(cred.password_encrypted);
    await page.fill(sel.login.user, cred.username);
    await page.fill(sel.login.pass, password);
    await Promise.all([
      page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {}),
      page.click(sel.login.submit),
    ]);
    await page.waitForTimeout(2500);

    // ── Page de missions ──
    await page.goto(cred.listing_url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate((s: Selectors) => {
      const out: Array<{ title: string; link: string; date: string }> = [];
      document.querySelectorAll(s.listing.item).forEach(card => {
        const titleEl = card.querySelector(s.listing.title) as HTMLElement | null;
        const linkEl = card.querySelector(s.listing.link) as HTMLAnchorElement | null;
        const dateEl = s.listing.date ? (card.querySelector(s.listing.date) as HTMLElement | null) : null;
        const title = (titleEl?.textContent || '').trim();
        const link = linkEl?.href || '';
        if (!title || !link) return;
        out.push({ title: title.slice(0, 200), link, date: (dateEl?.textContent || '').trim() });
      });
      return out;
    }, sel);

    if (items.length === 0) {
      return { ok: false, count: 0, error: 'Aucune mission trouvée — connexion échouée ou sélecteurs obsolètes' };
    }

    const rows = items.map(it => ({
      fingerprint:     fingerprintOf(it.title, cred.platform_name),
      title:           it.title,
      company:         '',
      location:        '',
      country:         '',
      description:     '',
      original_url:    it.link,
      mission_key:     normalizeMissionKey(it.title, ''),
      source_platform: `session:${cred.platform_name}`,
      source_category: 'freelance',
      source_type:     'free' as const,
      category:        'freelance-general',
      published_at:    it.date || new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('cache_opportunities')
      .upsert(rows, { onConflict: 'fingerprint', ignoreDuplicates: true });
    if (error?.message?.includes('mission_key')) {
      const stripped = rows.map(({ mission_key, ...r }) => r);
      await supabase.from('cache_opportunities').upsert(stripped, { onConflict: 'fingerprint', ignoreDuplicates: true });
    }

    log.push(`✅ ${cred.platform_name} : ${items.length} missions lues`);
    return { ok: true, count: items.length };
  } catch (e) {
    const msg = (e as any)?.message || 'erreur inconnue';
    log.push(`❌ ${cred.platform_name} : ${msg}`);
    return { ok: false, count: 0, error: msg };
  } finally {
    await browser.close();
  }
}

// Lit toutes les plateformes actives, une par une (jamais en parallèle —
// limiter la charge sur le même conteneur Render qui fait déjà tourner
// Next.js + le scheduler + le reste du scan).
export async function runPlatformSessionScan(): Promise<{ scanned: number; ok: number; log: string[] }> {
  const log: string[] = [];
  const { data: creds } = await supabase
    .from('platform_credentials')
    .select('*')
    .eq('status', 'active');

  if (!creds || creds.length === 0) {
    return { scanned: 0, ok: 0, log: ['Aucun identifiant actif configuré'] };
  }

  let okCount = 0;
  for (const cred of creds as CredentialRow[]) {
    const result = await scrapeOnePlatform(cred, log);
    const update: Record<string, any> = { last_scrape_at: new Date().toISOString() };
    if (result.ok) {
      okCount++;
      update.last_login_at = new Date().toISOString();
      update.last_scrape_count = result.count;
      update.last_login_error = null;
    } else {
      update.last_login_error = result.error || 'échec';
      // 3 échecs de login consécutifs (login_failed déjà présent) →
      // on désactive plutôt que de marteler un compte peut-être bloqué.
      if (cred.status === 'active' && /login|connexion|password|mot de passe/i.test(result.error || '')) {
        update.status = 'login_failed';
      }
    }
    await supabase.from('platform_credentials').update(update).eq('id', cred.id);
  }

  return { scanned: creds.length, ok: okCount, log };
}
