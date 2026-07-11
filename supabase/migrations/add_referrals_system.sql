-- ============================================
-- SEARCHER CONNECTOR — REFERRAL SYSTEM
-- ============================================
-- Migration pour ajouter le système de parrainage complet

-- 1. Ajouter la colonne referral_code aux profils
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Créer la table referrals pour tracker les parrainages
CREATE TABLE IF NOT EXISTS public.referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  premium_days_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_email)
);

-- 3. Index pour performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- 4. Générer un code de parrainage unique pour tous les utilisateurs existants
UPDATE public.profiles
SET referral_code = SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8)
WHERE referral_code IS NULL;

-- 5. Trigger pour générer automatiquement un code de parrainage lors de l'inscription
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- 6. Fonction pour réclamer une récompense de parrainage (7j premium + upgrade)
CREATE OR REPLACE FUNCTION claim_referral_reward(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  referral_row RECORD;
  total_days INTEGER := 0;
  upgraded_to_starter BOOLEAN := FALSE;
  current_plan TEXT;
BEGIN
  -- Récupérer toutes les références complétées non réclamées
  FOR referral_row IN
    SELECT id, status, premium_days_earned
    FROM public.referrals
    WHERE referrer_id = user_id_param
      AND status = 'completed'
      AND premium_days_earned = 0
  LOOP
    -- Ajouter 7 jours premium par filleul payant
    total_days := total_days + 7;
    
    -- Marquer la récompense comme réclamée
    UPDATE public.referrals
    SET premium_days_earned = 7
    WHERE id = referral_row.id;
  END LOOP;
  
  -- Ajouter les jours au profil
  IF total_days > 0 THEN
    UPDATE public.profiles
    SET premium_until = COALESCE(premium_until, NOW()) + (total_days || ' days')::INTERVAL
    WHERE id = user_id_param;
    
    -- Upgrade automatique free → starter au premier parrainage
    SELECT subscription_plan INTO current_plan FROM public.profiles WHERE id = user_id_param;
    IF current_plan = 'free' THEN
      UPDATE public.profiles
      SET subscription_plan = 'starter'
      WHERE id = user_id_param;
      upgraded_to_starter := TRUE;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'days_earned', total_days,
    'upgraded_to_starter', upgraded_to_starter
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can insert their own referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update their own referrals"
ON public.referrals FOR UPDATE
TO authenticated
USING (referrer_id = auth.uid());

-- 8. Commentaires
COMMENT ON TABLE public.referrals IS 'Système de parrainage: track les utilisateurs invités et leurs récompenses';
COMMENT ON COLUMN public.profiles.referral_code IS 'Code unique de parrainage partageable (8 caractères)';
COMMENT ON FUNCTION claim_referral_reward IS 'Réclame les récompenses de parrainage (7j premium par filleul payant)';
