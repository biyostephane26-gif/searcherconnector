import { callGeminiDirect } from './src/lib/scaiUtils.js';
import fs from 'fs';
import path from 'path';

const CATEGORIES = [
  { name: 'dev', keywords: ['React', 'JavaScript', 'Python', 'TypeScript', 'Node.js', 'Java', 'C++', 'Software Engineer', 'Developer'] },
  { name: 'marketing', keywords: ['Marketing', 'SEO', 'Growth', 'Social Media', 'Brand', 'Content'] },
  { name: 'design', keywords: ['UX', 'UI', 'Figma', 'Design', 'Product Designer', 'Graphic Design'] },
  { name: 'rédaction', keywords: ['Rédaction', 'Content Writer', 'Copywriting', 'Journalisme', 'Blog'] },
];

async function validateOpportunityQuality(opportunity) {
  const prompt = `
Tu es SCAI, expert en vérification de qualité des opportunités de travail. Analyse cette opportunité et réponds UNIQUEMENT en JSON valide dans ce format :
{
  "est_vraie_opportunite": true/false,
  "titre_valide": true/false,
  "description_suffisante": true/false,
  "source_identifiable": true/false,
  "date_presente": true/false,
  "salaire_mentionne": true/false,
  "pas_arnaque": true/false,
  "score_qualite": 0-100,
  "raison_rejet": "raison si score <70%"
}

INSTRUCTIONS :
- titre_valide : true si le titre est clair et non générique (pas "Job disponible")
- description_suffisante : true si la description fait plus de 50 mots
- pas_arnaque : true si pas de demande de paiement, pas de salaire irréaliste, pas de spam
- score_qualite : note de 0-100 (>=70 = acceptée, <70 = rejetée)

OPPORTUNITÉ À VÉRIFIER :
${JSON.stringify(opportunity, null, 2)}
`;

  try {
    const response = await callGeminiDirect(prompt);
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (e) {
    console.error('Erreur validation opportunité:', e);
  }
  return {
    est_vraie_opportunite: false,
    score_qualite: 0,
    raison_rejet: "Échec de l'analyse IA"
  };
}

async function main() {
  console.log('🚀 Lancement de la validation de qualité SCAI...');
  const report = {
    categories: {},
    sources: {},
    total_validated: 0,
    total_rejected: 0,
    average_score: 0
  };

  // Simuler des opportunités de test (en vrai on irait chercher dans le cache)
  const testOpportunities = [
    { id: 1, title: 'Développeur React Senior', company: 'Tech Corp', description: 'Nous recherchons un développeur React avec 5 ans d\'expérience pour travailler sur notre plateforme SaaS. Salaire 60k-80k€.', source: 'LinkedIn', date: '2026-07-04', location: 'Paris' },
    { id: 2, title: 'Job Disponible', company: '', description: 'Postez ici pour un job!', source: 'Spam', date: '', location: '' },
    { id: 3, title: 'Marketing Growth', company: 'Startup X', description: 'Gérer les campagnes SEO et social media pour doubler notre trafic. Salaire 40k€.', source: 'Indeed', date: '2026-07-03', location: 'Remote' }
  ];

  const allScores = [];
  for (const opp of testOpportunities) {
    const validation = await validateOpportunityQuality(opp);
    report.total_validated++;
    if (validation.score_qualite >= 70) {
      console.log(`✅ ${opp.title} accepté (${validation.score_qualite}%)`);
    } else {
      report.total_rejected++;
      console.log(`❌ ${opp.title} rejeté : ${validation.raison_rejet}`);
    }
    allScores.push(validation.score_qualite);
  }

  report.average_score = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const reportPath = path.join(process.cwd(), 'quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Rapport de qualité généré: ${reportPath}`);
  console.log(`📊 Score moyen: ${report.average_score}%`);
  console.log(`✅ Acceptés: ${report.total_validated - report.total_rejected}`);
  console.log(`❌ Rejetés: ${report.total_rejected}`);
}

main();
