// src/lib/confidence.ts

/**
 * Compute a Confidence Score (0‑100) for a scan operation.
 * The formula follows the business rules defined in the system prompt
 * (weights are expressed as points that are added/subtracted).
 */
export interface ConfidenceParams {
  /** 0‑100 indicating how complete the user's profile is */
  profileCompletion?: number;
  /** Boolean indicating whether the conversation context is clear */
  contextClear?: boolean;
  /** Number of successful similar scans in the past (historical success) */
  historicalSuccessCount?: number;
  /** Positive market signal – e.g. high demand for the niche (0‑1) */
  marketSignal?: number;
  /** Whether the recipient (target) is qualified for this query */
  recipientQualified?: boolean;
  /** Timing optimality (0‑1) – e.g. recent trend, seasonality */
  timingScore?: number;
  /** Whether the request used an approved template */
  templateValidated?: boolean;
}

export function calculateConfidence(params: ConfidenceParams): number {
  const {
    profileCompletion = 0,
    contextClear = false,
    historicalSuccessCount = 0,
    marketSignal = 0,
    recipientQualified = false,
    timingScore = 0,
    templateValidated = false,
  } = params;

  // Base points (positive)
  let score = 0;
  // +25 Profil complet et vérifié (we use 25 * completion%/100)
  score += (profileCompletion * 0.25);
  // +20 Contexte clairement établi
  if (contextClear) score += 20;
  // +15 Historique de succès similaire (capped at 3 successes -> 15)
  score += Math.min(historicalSuccessCount, 3) * 5; // 5 pts each up to 15
  // +10 Signal marché positif (scaled 0‑10)
  score += marketSignal * 10;
  // +15 Destinataire qualifié
  if (recipientQualified) score += 15;
  // +10 Timing optimal
  score += timingScore * 10;
  // +5 Template validé
  if (templateValidated) score += 5;

  // Penalties (negative)
  // -20 Données incomplètes (if profileCompletion < 50)
  if (profileCompletion < 50) score -= 20;
  // -15 Contexte ambigu (if not clear)
  if (!contextClear) score -= 15;
  // -30 Signal de sentiment négatif (if marketSignal < 0.2)
  if (marketSignal < 0.2) score -= 30;
  // -10 Premier contact sans historique (historicalSuccessCount === 0)
  if (historicalSuccessCount === 0) score -= 10;
  // -10 Timing sous‑optimal (timingScore < 0.3)
  if (timingScore < 0.3) score -= 10;
  // -15 Hors zone de compétence (we cannot determine here – placeholder)
  //   For now we assume inside zone.

  // Clamp between 0 and 100
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}
