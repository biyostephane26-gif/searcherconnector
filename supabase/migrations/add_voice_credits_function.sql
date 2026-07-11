-- ============================================
-- SEARCHER CONNECTOR — VOICE CREDITS SYSTEM
-- ============================================
-- Migration pour ajouter la fonction de déduction des crédits voix

-- Fonction pour déduire des crédits voix (utilisée par SCAI Voice)
CREATE OR REPLACE FUNCTION deduct_voice_credits(user_id_param UUID, credits_to_deduct INTEGER)
RETURNS JSON AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Récupérer les crédits actuels
  SELECT voice_credits INTO current_credits
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- Vérifier si l'utilisateur a suffisamment de crédits
  IF current_credits IS NULL OR current_credits < credits_to_deduct THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Insufficient voice credits',
      'current_credits', COALESCE(current_credits, 0)
    );
  END IF;
  
  -- Déduire les crédits
  new_credits := current_credits - credits_to_deduct;
  
  UPDATE public.profiles
  SET voice_credits = new_credits,
      voice_credits_used = COALESCE(voice_credits_used, 0) + credits_to_deduct
  WHERE id = user_id_param;
  
  -- Retourner le résultat
  RETURN json_build_object(
    'success', TRUE,
    'previous_credits', current_credits,
    'credits_deducted', credits_to_deduct,
    'remaining_credits', new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_voice_credits IS 'Déduit des crédits voix du profil utilisateur (utilisé par SCAI Voice API)';
