-- Fraîcheur globale + cap SC par instance (2026-07-27)
-- Une même mission peut être postée sur plusieurs plateformes (Malt,
-- Free-Work, LinkedIn...) — mission_key regroupe ces instances pour
-- calculer une fraîcheur globale (âge + total de postulants RÉELS, toutes
-- plateformes confondues) indépendamment du cap SC qui, lui, reste par
-- instance (original_url) pour maximiser la présence de l'utilisateur sur
-- chaque plateforme où le recruteur pourrait effectivement regarder.
-- Voir app/api/cache-scan/route.ts (evaluerFraicheur / cap SC).
ALTER TABLE cache_opportunities ADD COLUMN IF NOT EXISTS mission_key text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS mission_key text;

CREATE INDEX IF NOT EXISTS idx_cache_opportunities_mission_key ON cache_opportunities(mission_key);
