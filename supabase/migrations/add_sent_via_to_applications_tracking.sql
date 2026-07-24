-- =================================================================
-- Ajoute sent_via + original_url à applications_tracking et
-- applications_sent — la page "Mes Candidatures" (Applications.tsx)
-- lit applications_tracking (peuplée automatiquement par un trigger sur
-- applications_sent), mais :
--   1. Le trigger ne copiait jamais sent_via ('scai_auto' vs 'manual')
--      → impossible de voir/filtrer les candidatures que SCAI a
--      envoyées seule.
--   2. Le seul lien vers l'offre passait par la FK opportunity_id →
--      opportunities.original_url, qui devient NULL dès que
--      l'opportunité est purgée du cache (ON DELETE SET NULL) — la
--      preuve disparaissait avec le temps. On la fige à l'instant T.
-- =================================================================

ALTER TABLE applications_tracking ADD COLUMN IF NOT EXISTS sent_via TEXT DEFAULT 'manual';
ALTER TABLE applications_sent ADD COLUMN IF NOT EXISTS original_url TEXT;
ALTER TABLE applications_tracking ADD COLUMN IF NOT EXISTS original_url TEXT;

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
    sent_via,
    original_url
  ) VALUES (
    NEW.user_id,
    NEW.opportunity_id,
    NEW.id,
    NEW.job_title,
    NEW.company,
    NEW.applied_at,
    'applied',
    COALESCE(NEW.sent_via, 'manual'),
    NEW.original_url
  )
  ON CONFLICT (application_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rattrapage des lignes déjà envoyées : sent_via et original_url depuis
-- applications_sent (qui a toujours eu sent_via) et depuis opportunities
-- tant que le lien y vit encore (celles déjà purgées : rien à récupérer).
UPDATE applications_sent a
SET original_url = o.original_url
FROM opportunities o
WHERE a.opportunity_id = o.id AND a.original_url IS NULL;

UPDATE applications_tracking t
SET sent_via = s.sent_via,
    original_url = s.original_url
FROM applications_sent s
WHERE t.application_id = s.id
  AND (t.sent_via IS DISTINCT FROM s.sent_via OR t.original_url IS DISTINCT FROM s.original_url);
