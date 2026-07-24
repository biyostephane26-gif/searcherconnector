-- =================================================================
-- Détecteur de panne des sources de scraping.
-- Avant : quand une source RSS/API échouait (erreur réseau, format
-- cassé, ou — cas des ~87 entrées LinkedIn/Upwork/Twitter "api" —
-- une plateforme qui ne sert jamais de JSON à une requête anonyme),
-- l'erreur partait dans les logs serveur et disparaissait. Aucun
-- moyen de distinguer une source RSS légitime qui vient de casser
-- (changement de format) d'une source décorative qui n'a jamais
-- fonctionné.
-- =================================================================

CREATE TABLE IF NOT EXISTS source_health (
  source_name text PRIMARY KEY,
  last_success_at timestamptz,
  last_attempt_at timestamptz DEFAULT now(),
  consecutive_failures integer DEFAULT 0,
  last_error text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_health_failures ON source_health(consecutive_failures DESC);

-- Upsert atomique — évite un aller-retour lecture-puis-écriture depuis
-- l'app (risque de race condition entre plusieurs scans concurrents).
CREATE OR REPLACE FUNCTION record_source_outcome(p_name text, p_ok boolean, p_error text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO source_health (source_name, last_success_at, last_attempt_at, consecutive_failures, last_error, updated_at)
  VALUES (
    p_name,
    CASE WHEN p_ok THEN now() ELSE NULL END,
    now(),
    CASE WHEN p_ok THEN 0 ELSE 1 END,
    p_error,
    now()
  )
  ON CONFLICT (source_name) DO UPDATE SET
    last_success_at       = CASE WHEN p_ok THEN now() ELSE source_health.last_success_at END,
    last_attempt_at        = now(),
    consecutive_failures   = CASE WHEN p_ok THEN 0 ELSE source_health.consecutive_failures + 1 END,
    last_error              = CASE WHEN p_ok THEN NULL ELSE p_error END,
    updated_at              = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE source_health ENABLE ROW LEVEL SECURITY;

-- Même pattern que scraper_sessions/founder_alerts (schema.sql) : lecture
-- réservée au fondateur. Les écritures passent par record_source_outcome()
-- en SECURITY DEFINER depuis les routes API (clé service_role), donc pas
-- besoin de policy INSERT/UPDATE ici.
CREATE POLICY "founder_read_source_health" ON source_health
  FOR SELECT USING (auth.uid() IN (SELECT id FROM users_profiles WHERE role = 'founder'));
