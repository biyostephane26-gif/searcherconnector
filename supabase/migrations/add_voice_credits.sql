-- Migration: Ajouter système de crédits vocaux dans users_profiles
-- Date: 2026-07-04

-- Ajouter colonne voice_credits à users_profiles
ALTER TABLE users_profiles 
ADD COLUMN IF NOT EXISTS voice_credits INTEGER DEFAULT 0 CHECK (voice_credits >= 0);

-- Ajouter colonne missions_completed pour le système de niveau
ALTER TABLE users_profiles 
ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0 CHECK (missions_completed >= 0);

-- Définir les crédits par défaut selon le plan
-- Free: 0, Starter: 60, Pro: 300
UPDATE users_profiles SET voice_credits = 
  CASE 
    WHEN plan = 'pro' THEN 300
    WHEN plan = 'starter' THEN 60
    ELSE 0
  END
WHERE voice_credits = 0;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_profiles_voice_credits ON users_profiles(voice_credits);
CREATE INDEX IF NOT EXISTS idx_users_profiles_missions_completed ON users_profiles(missions_completed);

-- Fonction pour décompter les crédits vocaux (appelée depuis les API routes)
CREATE OR REPLACE FUNCTION deduct_voice_credits(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Récupérer les crédits actuels avec lock
  SELECT voice_credits INTO current_credits
  FROM users_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Vérifier si assez de crédits
  IF current_credits >= p_amount THEN
    UPDATE users_profiles
    SET voice_credits = voice_credits - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour recharger les crédits mensuellement (via cron ou founder dashboard)
CREATE OR REPLACE FUNCTION refill_voice_credits()
RETURNS void AS $$
BEGIN
  UPDATE users_profiles
  SET voice_credits = CASE 
    WHEN plan = 'pro' THEN 300
    WHEN plan = 'starter' THEN 60
    ELSE 0
  END,
  updated_at = NOW()
  WHERE plan IN ('starter', 'pro');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_voice_credits IS 'Décompte les crédits vocaux de manière atomique';
COMMENT ON FUNCTION refill_voice_credits IS 'Recharge les crédits vocaux mensuellement selon le plan';
