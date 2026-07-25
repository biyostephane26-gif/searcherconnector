-- =================================================================
-- RÉPARATION DU SYSTÈME DE PARRAINAGE — cassé à trois niveaux :
--
-- 1. Rien ne créait jamais de ligne dans `referrals` : Signup.tsx ne
--    lisait même pas le paramètre ?ref= de l'URL. Le programme de
--    parrainage n'a jamais suivi un seul filleul depuis sa création.
-- 2. app/api/referral/claim/route.ts lit/écrit reward_claimed,
--    reward_days, claimed_at — colonnes qui n'existaient pas (seule
--    la version simple de schema.sql avait été appliquée : id,
--    referrer_id, referred_id, reward_applied, created_at).
-- 3. Une migration antérieure (add_referrals_system.sql) visait une
--    table `public.profiles` qui n'existe pas dans ce projet (le vrai
--    nom est `users_profiles`) — elle n'a jamais pu s'exécuter avec
--    succès, donc les colonnes qu'elle promettait (referred_user_id,
--    status, premium_days_earned...) n'existent pas non plus.
--
-- Cette migration aligne la table réelle sur ce que le code (claim
-- route + Referrals.tsx, corrigés dans le même commit) attend vraiment.
-- =================================================================

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_claimed boolean DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_days integer DEFAULT 7;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
