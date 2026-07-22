-- =================================================================
-- CORRECTIF — plan_expiry manquant sur users_profiles.
-- Le dashboard Founder (src/views/Founder.tsx : updateUserPlan,
-- activatePlan1Month) écrit déjà ce champ pour activer un plan payant
-- manuellement (paiement hors Afrique, essai temporaire) avec ou sans
-- expiration — mais la colonne n'a jamais existé en base, donc CHAQUE
-- activation manuelle de plan échouait silencieusement contre
-- PostgREST ("colonne introuvable"). Découvert le 22/07/2026 en
-- auditant le dashboard Founder après le fix de la contrainte plan.
-- =================================================================

alter table users_profiles add column if not exists plan_expiry timestamptz;

comment on column users_profiles.plan_expiry is
  'Date de retour automatique au plan free (NULL = permanent). Vérifié par /api/cron/plan-expiry-check.';
