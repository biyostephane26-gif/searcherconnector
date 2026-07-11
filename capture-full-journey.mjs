import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function captureJourney() {
  console.log('🎬 Lancement du test complet de l\'application...\n');

  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Pour voir les actions en direct
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: join(__dirname, 'videos') }
  });
  const page = await context.newPage();

  // Base URL
  const BASE_URL = 'http://localhost:3000';

  let currentStep = 1;
  const report = [];

  // Helper: Capture screenshot with step counter
  const capture = async (name, wait = 1000) => {
    await page.waitForTimeout(wait);
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const stepStr = String(currentStep).padStart(2, '0');
    const screenshotPath = join(__dirname, 'screenshots', `${stepStr}-${safeName}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Étape ${currentStep}: ${name} → ${screenshotPath}`);
      report.push({ step: currentStep, name, status: '✅' });
      currentStep++;
    } catch (e) {
      console.error(`❌ Étape ${currentStep}: ${name} → Échec`, e);
      report.push({ step: currentStep, name, status: '❌' });
      currentStep++;
    }
  };

  // Helper: Safe click (try multiple selectors)
  const safeClick = async (selectors) => {
    for (const selector of selectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  };

  // Helper: Safe navigation (don't break the script)
  const safeGoto = async (url, name) => {
    try {
      // Essayer d'abord avec domcontentloaded, plus rapide
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.log(`   ⚠️ ${name} - domcontentloaded timeout, essayons sans wait...`);
      try {
        await page.goto(url, { waitUntil: 'commit', timeout: 30000 });
      } catch (e2) {
        console.log(`   ⚠️ ${name} - Navigation échouée, capture quand même l'état actuel`);
      }
    }
  };

  // ─────────────────────────────────────────────────────────
  // PARCOURS COMPLET UTILISATEUR
  // ─────────────────────────────────────────────────────────

  console.log('📍 Étape 1: Landing Page');
  await safeGoto(BASE_URL, 'Landing Page');
  await capture('landing-page', 2000);

  // Essayer de cliquer sur "Get Started" ou un bouton similaire
  console.log('📍 Étape 2: Clic sur Get Started');
  await safeClick(['text="Get Started"', 'text="Commencer"', 'text="Démarrer"', 'button']);
  await capture('after-get-started', 1500);

  // Aller à la page de connexion
  console.log('📍 Étape 3: Page de Connexion');
  await safeGoto(`${BASE_URL}/login`, 'Login Page');
  await capture('login-page', 1500);

  // Essayer de se connecter avec des données mock (même si ça ne marche pas réellement)
  console.log('📍 Étape 4: Remplir le formulaire de connexion');
  try {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
  } catch (e) {
    console.log('   Pas de champs de connexion trouvés');
  }
  await capture('login-form-filled', 1500);

  // Essayer de soumettre
  console.log('📍 Étape 5: Soumettre le formulaire');
  await safeClick(['button[type="submit"]', 'text="Se connecter"', 'text="Login"']);
  await capture('login-submitted', 2000);

  // Aller au Dashboard
  console.log('📍 Étape 6: Dashboard');
  await safeGoto(`${BASE_URL}/dashboard`, 'Dashboard');
  await capture('dashboard', 2500);

  // Page des opportunités
  console.log('📍 Étape 7: Page des Opportunités');
  await safeGoto(`${BASE_URL}/opportunities`, 'Opportunités');
  await capture('opportunities-page', 2000);

  // Essayer de lancer un scan (si un bouton existe)
  console.log('📍 Étape 8: Essayer de lancer un scan');
  await safeClick(['text="Lancer un scan"', 'text="Scan"', 'text="Démarrer le scan"', 'button']);
  await capture('scan-attempt', 2000);

  // Page Social
  console.log('📍 Étape 9: Page Social');
  await safeGoto(`${BASE_URL}/social`, 'Social');
  await capture('social-page', 2000);

  // Page Profil
  console.log('📍 Étape 10: Page Profil');
  await safeGoto(`${BASE_URL}/profile`, 'Profil');
  await capture('profile-page', 2000);

  // Page Interview Preps
  console.log('📍 Étape 11: Interview Preps');
  await safeGoto(`${BASE_URL}/interview-preps`, 'Interview Preps');
  await capture('interview-preps', 2000);

  // Portfolio Analyzer
  console.log('📍 Étape 12: Portfolio Analyzer');
  await safeGoto(`${BASE_URL}/portfolio-analyzer`, 'Portfolio Analyzer');
  await capture('portfolio-analyzer', 2000);

  // Pricing
  console.log('📍 Étape 13: Page Pricing');
  await safeGoto(`${BASE_URL}/pricing`, 'Pricing');
  await capture('pricing-page', 2000);

  // Settings
  console.log('📍 Étape 14: Paramètres');
  await safeGoto(`${BASE_URL}/settings`, 'Settings');
  await capture('settings-page', 2000);

  // About
  console.log('📍 Étape 15: About');
  await safeGoto(`${BASE_URL}/about`, 'About');
  await capture('about-page', 2000);

  // Cowork
  console.log('📍 Étape 16: Cowork');
  await safeGoto(`${BASE_URL}/cowork`, 'Cowork');
  await capture('cowork-page', 2000);

  // Founder Dashboard (même si pas founder)
  console.log('📍 Étape 17: Founder Dashboard');
  await safeGoto(`${BASE_URL}/founder`, 'Founder Dashboard');
  await capture('founder-dashboard', 2000);

  // Talent Search
  console.log('📍 Étape 18: Talent Search');
  await safeGoto(`${BASE_URL}/talent-search`, 'Talent Search');
  await capture('talent-search', 2000);

  // Groups
  console.log('📍 Étape 19: Groups');
  await safeGoto(`${BASE_URL}/groups`, 'Groups');
  await capture('groups-page', 2000);

  // Salary
  console.log('📍 Étape 20: Salary');
  await safeGoto(`${BASE_URL}/salary`, 'Salary');
  await capture('salary-page', 2000);

  // Agent
  console.log('📍 Étape 21: Agent');
  await safeGoto(`${BASE_URL}/agent`, 'Agent');
  await capture('agent-page', 2000);

  // Articles
  console.log('📍 Étape 22: Articles');
  await safeGoto(`${BASE_URL}/articles`, 'Articles');
  await capture('articles-page', 2000);

  // Support
  console.log('📍 Étape 23: Support');
  await safeGoto(`${BASE_URL}/support`, 'Support');
  await capture('support-page', 2000);

  // Retour à la landing
  console.log('📍 Étape 24: Retour à la Landing');
  await safeGoto(BASE_URL, 'Final Landing');
  await capture('final-landing', 2000);

  // ─────────────────────────────────────────────────────────
  // FINAL
  // ─────────────────────────────────────────────────────────

  console.log('\n✅ Test terminé !');
  await context.close();
  await browser.close();

  // Écrire rapport
  const reportText = [
    '# Rapport Test Complet',
    `Date: ${new Date().toLocaleString()}`,
    '',
    '## Résumé:',
    ...report.map(r => `${r.step}. ${r.name} - ${r.status}`)
  ].join('\n');
  const reportPath = join(__dirname, 'capture-report.txt');
  fs.writeFileSync(reportPath, reportText);
  console.log(`✅ Rapport final: ${reportPath}`);
}

captureJourney().catch(err => {
  console.error('❌ Erreur dans le test:', err);
  process.exit(1);
});
