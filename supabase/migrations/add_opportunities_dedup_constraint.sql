-- Empêche les doublons (user_id, original_url) au niveau base de données.
--
-- Contexte : le dédoublonnage actuel dans src/pages/api/scan.ts fait un
-- SELECT des URLs déjà présentes, filtre les nouvelles opportunités contre
-- ce Set en mémoire, PUIS insère — un vrai TOCTOU (time-of-check to
-- time-of-use). Vérifié en direct sur la base de prod le 2026-09-22 : deux
-- comptes (dont ceux du fondateur) ont chacun une paire de lignes avec la
-- MÊME original_url et un created_at identique à la microseconde près sur
-- la première moitié de la paire, ~0.35s d'écart sur la seconde — signature
-- exacte de deux scans qui se chevauchent, chacun ayant lu "pas encore
-- présent" avant que l'autre n'ait inséré.
--
-- Index partiel (pas une contrainte UNIQUE classique) car original_url
-- peut être '' pour des lignes mal formées historiques — on ne veut
-- bloquer que les vrais doublons avec une URL réelle.
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_user_url_unique
  ON opportunities (user_id, original_url)
  WHERE original_url IS NOT NULL AND original_url <> '';
