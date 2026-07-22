-- Migration: Système de tracking des candidatures avec statuts
-- Date: 2026-07-04

-- Colonne manquante référencée par le trigger plus bas — sans elle,
-- le passage au statut 'accepted' fait planter le trigger (BEFORE UPDATE).
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0;

-- Table pour tracker l'évolution des candidatures
CREATE TABLE IF NOT EXISTS applications_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications_sent(id) ON DELETE SET NULL,
  
  -- Informations de base
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  
  -- Statut de la candidature
  status TEXT DEFAULT 'applied' CHECK (
    status IN ('applied', 'viewed', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted', 'rejected', 'withdrawn')
  ),
  
  -- Métadonnées
  notes TEXT,
  interview_date TIMESTAMP,
  interview_type TEXT, -- phone, video, in-person
  offer_amount DECIMAL(10,2),
  offer_currency TEXT DEFAULT 'USD',
  rejection_reason TEXT,
  
  -- Timestamps
  viewed_at TIMESTAMP,
  interview_scheduled_at TIMESTAMP,
  offer_received_at TIMESTAMP,
  final_decision_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_application_tracking UNIQUE(application_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_applications_tracking_user_id ON applications_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_tracking_status ON applications_tracking(status);
CREATE INDEX IF NOT EXISTS idx_applications_tracking_applied_at ON applications_tracking(applied_at DESC);

-- RLS policies
ALTER TABLE applications_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application tracking"
  ON applications_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application tracking"
  ON applications_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application tracking"
  ON applications_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application tracking"
  ON applications_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour créer automatiquement un tracking quand une application est envoyée
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
    NEW.created_at,
    'applied'
  )
  ON CONFLICT (application_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour auto-créer le tracking
CREATE TRIGGER auto_create_application_tracking
  AFTER INSERT ON applications_sent
  FOR EACH ROW
  EXECUTE FUNCTION create_application_tracking();

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_applications_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Mettre à jour les timestamps selon le statut
  IF NEW.status = 'viewed' AND OLD.status != 'viewed' THEN
    NEW.viewed_at = NOW();
  ELSIF NEW.status = 'interview_scheduled' AND OLD.status != 'interview_scheduled' THEN
    NEW.interview_scheduled_at = NOW();
  ELSIF NEW.status = 'offer_received' AND OLD.status != 'offer_received' THEN
    NEW.offer_received_at = NOW();
  ELSIF NEW.status IN ('accepted', 'rejected', 'withdrawn') AND OLD.status NOT IN ('accepted', 'rejected', 'withdrawn') THEN
    NEW.final_decision_at = NOW();
    
    -- Incrémenter missions_completed si accepté
    IF NEW.status = 'accepted' THEN
      UPDATE users_profiles
      SET missions_completed = missions_completed + 1
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_tracking_timestamp_trigger
  BEFORE UPDATE ON applications_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_tracking_timestamp();

COMMENT ON TABLE applications_tracking IS 'Tracking détaillé de l''évolution des candidatures avec statuts';
COMMENT ON COLUMN applications_tracking.status IS 'applied -> viewed -> interview_scheduled -> interview_completed -> offer_received -> accepted/rejected/withdrawn';
