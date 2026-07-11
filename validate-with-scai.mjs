import { callGeminiDirect } from './src/lib/scaiUtils.js';
import fs from 'fs';
import path from 'path';

const TEST_PROFILES = [
  { name: 'Dev Senior Anglophone', domain: 'Software Development', country: 'USA', languages: ['English'], skills: ['React', 'TypeScript', 'Node.js'], target_roles: ['Senior Software Engineer'] },
  { name: 'Marketeur Francophone', domain: 'Marketing', country: 'France', languages: ['French'], skills: ['SEO', 'Growth'], target_roles: ['Growth Marketing Manager'] },
  { name: 'Designer Brésilien', domain: 'UX/UI', country: 'Brazil', languages: ['Portuguese'], skills: ['Figma', 'Product Design'], target_roles: ['UX Designer'] },
];

const TEST_LANGUAGES = ['fr', 'en', 'pt'];

const TAXONOMY_CATEGORIES = ['Développement', 'Marketing', 'Design', 'Rédaction', 'Ventes', 'Finance', 'Data'];

async function scaiValidateOpportunity(opportunity, profile) {
  const prompt = `
Tu es SCAI, juge final de la qualité du système Searcher Connector. Analyse cette opportunité et réponds UNIQUEMENT en JSON valide :
{
  "est_vraie_opportunite": true/false,
  "correspond_au_metier": true/false,
  "langue_correcte": true/false,
  "score_qualite": 0-100,
  "raison_rejet": "si applicable"
}

PROFIL : ${JSON.stringify(profile)}
OPPORTUNITÉ : ${JSON.stringify(opportunity)}
`;
  try {
    const resp = await callGeminiDirect(prompt);
    const jsonMatch = resp?.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error(e);
  }
  return { score_qualite: 0, est_vraie_opportunite: false };
}

async function main() {
  console.log('🤖 SCAI VALIDATION DU SYSTÈME EN COURS...');
  const report = {
    global_score: 0,
    total_tested: 0,
    passed: 0,
    failed: 0,
    issues: [],
    recommendations: [],
    final_verdict: ''
  };

  // Simuler des opportunités
  const testOpportunities = [
    { id: 1, title: 'Senior React Engineer', company: 'CloudTech', description: 'We need a senior React dev for our SaaS product.', location: 'Remote', language: 'en' },
    { id: 2, title: 'Growth Marketing', company: 'StartupY', description: 'Gérer SEO et réseaux sociaux.', location: 'Paris', language: 'fr' }
  ];

  const allScores = [];
  for (const profile of TEST_PROFILES) {
    console.log(`\n🔍 Validation pour ${profile.name}...`);
    for (const opp of testOpportunities) {
      report.total_tested++;
      const validation = await scaiValidateOpportunity(opp, profile);
      allScores.push(validation.score_qualite);
      if (validation.score_qualite >= 70) {
        report.passed++;
        console.log(`✅ ${opp.title} : ${validation.score_qualite}%`);
      } else {
        report.failed++;
        report.issues.push(`${opp.title} : ${validation.raison_rejet}`);
      }
    }
  }

  report.global_score = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  if (report.global_score >= 80) {
    report.final_verdict = '✅ Prêt pour le déploiement';
    report.recommendations = ['Maintenir la qualité actuelle'];
  } else {
    report.final_verdict = '❌ Corrections nécessaires';
    report.recommendations = ['Améliorer la qualité des sources', 'Renforcer les filtres anti-arnaque'];
  }

  const reportPath = path.join(process.cwd(), 'scai-final-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n══════════════════════════════════════');
  console.log('📊 RAPPORT FINAL SCAI');
  console.log('══════════════════════════════════════');
  console.log(`Score global: ${report.global_score}%`);
  console.log(`Passés: ${report.passed}`);
  console.log(`Échoués: ${report.failed}`);
  console.log(`Verdict: ${report.final_verdict}`);
  console.log(`Rapport détaillé: ${reportPath}`);
  console.log('══════════════════════════════════════');
}

main();
