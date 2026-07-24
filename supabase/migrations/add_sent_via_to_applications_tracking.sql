-- =================================================================
-- Ajoute sent_via à applications_tracking — la page "Mes Candidatures"
-- (Applications.tsx) lit CETTE table (peuplée automatiquement par un
-- trigger sur applications_sent), mais le trigger ne copiait jamais
-- sent_via ('scai_auto' vs 'manual'). Résultat : aucun moyen de voir
-- ni filtrer les candidatures que SCAI a envoyées seul, alors que
-- applications_sent le sait très bien depuis le début.
-- =================================================================

ALTER TABLE applications_tracking ADD COLUMN IF NOT EXISTS sent_via TEXT DEFAULT 'manual';

CREATE OR REPLACE FUNCTION create_application_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO applications_tracking (
    user_id,
    opportunity_id,
    application_id,
    job_title,
    company,
    applied_at,
    status,
    sent_via
  ) VALUES (
    NEW.user_id,
    NEW.opportunity_id,
    NEW.id,
    NEW.job_title,
    NEW.company,
    NEW.applied_at,
    'applied',
    COALESCE(NEW.sent_via, 'manual')
  )
  ON CONFLICT (application_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rattrapage : les lignes déjà créées par le trigger avant ce correctif
-- sont toutes restées à 'manual' par défaut (colonne inexistante) — on
-- les recale depuis applications_sent, qui a toujours eu la vraie valeur.
UPDATE applications_tracking t
SET sent_via = s.sent_via
FROM applications_sent s
WHERE t.application_id = s.id
  AND s.sent_via IS NOT NULL
  AND t.sent_via IS DISTINCT FROM s.sent_via;
