-- =================================================================
-- CORRECTIF URGENT — le trigger installé par add_applications_tracking.sql
-- référence NEW.created_at, colonne inexistante sur applications_sent
-- (qui a applied_at, pas created_at). Ça bloquait TOUTE insertion dans
-- applications_sent depuis l'activation de la migration précédente.
-- =================================================================

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
    status
  ) VALUES (
    NEW.user_id,
    NEW.opportunity_id,
    NEW.id,
    NEW.job_title,
    NEW.company,
    NEW.applied_at,
    'applied'
  )
  ON CONFLICT (application_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
