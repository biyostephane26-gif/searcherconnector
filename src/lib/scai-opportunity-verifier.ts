// =================================================================
// SCAI — SYSTÈME DE VÉRIFICATION & RECOMMANDATION DES OPPORTUNITÉS
// =================================================================
// Vérifie et scorie chaque opportunité par rapport au profil complet de l'utilisateur

import { callGeminiDirect } from './scaiUtils';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  domain?: string;
  profile_type?: 'job_seeker' | 'freelancer' | 'investor' | 'business';
  country?: string;
  city?: string;
  bio?: string;
  skills?: string[];
  experience_years?: number;
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  target_roles?: string[];
  target_salary_min?: number;
  target_salary_max?: number;
  target_currency?: string;
  plan?: string;
  isPaid?: boolean;
}

export interface Opportunity {
  id?: string;
  title: string;
  company?: string;
  location?: string;
  link: string;
  snippet?: string;
  date?: string;
  source?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  applicants_count?: number;
  required_skills?: string[];
  job_type?: string;
  description?: string;
}

export interface VerifiedOpportunity extends Opportunity {
  verification_score: number; // 0-100
  match_reasons: string[];
  improvement_tips?: string[];
  is_recommended: boolean;
  freshness_score: number; // 0-100 based on date
}

// ─────────────────────────────────────────────────────────────────
// FONCTION UTILITAIRE : Calcul du score de fraîcheur
// ─────────────────────────────────────────────────────────────────

function calculateFreshnessScore(dateString?: string): number {
  if (!dateString) return 50; // Score moyen si pas de date

  try {
    const date = new Date(dateString);
    const now = new Date();
    const ageMs = now.getTime() - date.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours <= 6) return 100;
    if (ageHours <= 12) return 90;
    if (ageHours <= 24) return 80;
    if (ageHours <= 48) return 60;
    if (ageHours <= 72) return 40;
    return Math.max(0, 100 - Math.floor(ageHours / 24) * 5);
  } catch {
    return 50;
  }
}

// ─────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE : Vérification & Scoring IA
// ─────────────────────────────────────────────────────────────────

export async function verifyOpportunity(
  opportunity: Opportunity,
  userProfile: UserProfile
): Promise<VerifiedOpportunity> {
  const freshnessScore = calculateFreshnessScore(opportunity.date);

  // Préparer le prompt pour l'IA
  const prompt = `
Tu es SCAI, expert en recommandation de carrières et d'opportunités. Analyse cette opportunité et scorie-la par rapport au profil de l'utilisateur.

=================================
PROFIL DE L'UTILISATEUR
=================================
Nom : ${userProfile.full_name || 'Non renseigné'}
Type de profil : ${userProfile.profile_type || 'job_seeker'}
Domaine / compétences : ${userProfile.domain || userProfile.skills?.join(', ') || 'Non renseigné'}
Pays : ${userProfile.country || 'Non renseigné'}
Ville : ${userProfile.city || 'Non renseigné'}
Expérience : ${userProfile.experience_years ? `${userProfile.experience_years} ans` : 'Non renseigné'}
Bio : ${userProfile.bio || 'Non renseignée'}
Rôles cibles : ${userProfile.target_roles?.join(', ') || 'Non renseignés'}
Salaire cible : ${userProfile.target_salary_min || userProfile.target_salary_max ? `${userProfile.target_currency || '€'} ${userProfile.target_salary_min || ''} - ${userProfile.target_salary_max || ''}` : 'Non renseigné'}

=================================
OPPORTUNITÉ À ANALYSER
=================================
Titre : ${opportunity.title}
Entreprise : ${opportunity.company || 'Non renseignée'}
Source : ${opportunity.source || 'Inconnue'}
Lieu : ${opportunity.location || 'Non renseigné'}
Description / Extrait : ${opportunity.snippet || opportunity.description || 'Pas de description disponible'}
Salaire : ${opportunity.salary_min || opportunity.salary_max ? `${opportunity.currency || '€'} ${opportunity.salary_min || ''} - ${opportunity.salary_max || ''}` : 'Non renseigné'}
Date de publication : ${opportunity.date || 'Non renseignée'}
Nombre de candidats : ${opportunity.applicants_count || 'Inconnu'}
Compétences requises : ${opportunity.required_skills?.join(', ') || 'Non renseignées'}
Type de poste : ${opportunity.job_type || 'Non renseigné'}

=================================
INSTRUCTIONS
=================================
Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant/après, dans ce format :
{
  "score": 0-100,
  "match_reasons": ["liste de raisons pour le score"],
  "improvement_tips": ["liste de conseils pour postuler ou pour optimiser le profil"],
  "is_recommended": true/false
}

- Score 0-100 basé sur la pertinence par rapport au profil
- is_recommended true si score >= 70 OU opportunité ultra-fraîche (< 24h) OU peu de candidats (< 10)
- Sois objectif et précis
  `;

  let verificationData: {
    score: number;
    match_reasons: string[];
    improvement_tips: string[];
    is_recommended: boolean;
  } = {
    score: 50,
    match_reasons: ['Analyse en attente'],
    improvement_tips: [],
    is_recommended: freshnessScore >= 80,
  };

  try {
    const response = await callGeminiDirect(prompt);
    if (response) {
      // Nettoyer la réponse pour ne garder que le JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationData = JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('❌ Erreur vérification IA opportunité:', error);
  }

  // Calculer le score final (combinaison score IA + fraîcheur)
  const finalScore = Math.round(
    (verificationData.score * 0.7) + (freshnessScore * 0.3)
  );

  return {
    ...opportunity,
    verification_score: finalScore,
    match_reasons: verificationData.match_reasons,
    improvement_tips: verificationData.improvement_tips,
    is_recommended: verificationData.is_recommended || (freshnessScore >= 80),
    freshness_score: freshnessScore,
  };
}

// ─────────────────────────────────────────────────────────────────
// FONCTION : Vérifier un lot d'opportunités
// ─────────────────────────────────────────────────────────────────

export async function verifyOpportunitiesBatch(
  opportunities: Opportunity[],
  userProfile: UserProfile,
  concurrency: number = 3
): Promise<VerifiedOpportunity[]> {
  const results: VerifiedOpportunity[] = [];

  for (let i = 0; i < opportunities.length; i += concurrency) {
    const batch = opportunities.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(opp => verifyOpportunity(opp, userProfile))
    );
    results.push(...batchResults);
  }

  // Trier par score décroissant
  return results.sort((a, b) => b.verification_score - a.verification_score);
}
