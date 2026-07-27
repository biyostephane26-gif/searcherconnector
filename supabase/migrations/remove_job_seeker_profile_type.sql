-- Passage freelance-only (2026-07-27) : job_seeker retiré du produit.
-- Raison : le mix de sources job-board + freelance dans le pipeline de scan
-- causait un mixup structurel (un profil freelance recevait ~80% d'offres
-- CDI classiques) et les job seekers avaient une rétention trop faible
-- (partent dès qu'ils trouvent un emploi). Voir src/lib/scraper/typeSignals.ts
-- et FREELANCE_PLATFORMS_CURATED dans massive-sources.ts.

-- 1) Migre les comptes existants en 'freelance' (non destructif — aucune
--    donnée utilisateur perdue, juste le type de profil).
UPDATE users_profiles SET profile_type = 'freelance' WHERE profile_type = 'job_seeker';

-- 2) Retire 'job_seeker' des valeurs autorisées pour empêcher toute
--    réintroduction accidentelle (le CHECK constraint original est dans
--    src/lib/schema.sql).
ALTER TABLE users_profiles DROP CONSTRAINT IF EXISTS users_profiles_profile_type_check;
ALTER TABLE users_profiles ADD CONSTRAINT users_profiles_profile_type_check
  CHECK (profile_type IN ('freelance', 'business', 'investor'));
