-- =================================================================
-- CORRECTIF CRITIQUE — la contrainte CHECK réelle sur users_profiles.plan
-- n'autorisait encore que les anciennes valeurs (probablement
-- 'free'/'talent'/'business'/'investor', l'ancien modèle 4 profils).
-- Tout le code de l'application (Pricing.tsx, webhook Stripe, webhook
-- Monetbil, activation manuelle par le fondateur, Signup.tsx) écrit
-- 'starter'/'pro' depuis longtemps déjà — chaque tentative de mise à
-- niveau de plan échouait donc en silence contre cette contrainte,
-- sans jamais persister en base. Aucun utilisateur payant n'a jamais pu
-- être réellement passé en Starter ou Pro.
-- Découvert le 22/07/2026 en testant manuellement le passage plan
-- gratuit → payant : l'écriture était rejetée avec l'erreur
-- "new row for relation users_profiles violates check constraint
-- users_profiles_plan_check".
-- =================================================================

alter table users_profiles drop constraint if exists users_profiles_plan_check;
alter table users_profiles add constraint users_profiles_plan_check
  check (plan in ('free', 'starter', 'pro', 'enterprise'));
