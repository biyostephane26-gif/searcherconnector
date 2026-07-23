-- =================================================================
-- CONSOLIDATION CRÉDITS VOCAUX — CORRECTIF CRITIQUE
-- =================================================================
-- État constaté en base (22/07/2026) :
--   • users_profiles.voice_credits : COLONNE ABSENTE (migration jamais passée)
--   • deduct_voice_credits : FONCTION ABSENTE (aucune des 2 signatures)
--   • user_voice_credits : table vide
-- Conséquence : SCAI Voice TTS échouait pour TOUT LE MONDE (402 crédits
-- insuffisants) sauf le fondateur qui bypasse. Le frontend affichait 0.
--
-- Ce fichier consolide TOUT sur users_profiles.voice_credits :
--   1. colonnes voice_credits / voice_credits_used
--   2. backfill par plan (founder illimité)
--   3. RPC canonique deduct_voice_credits(p_user_id, p_amount) → BOOLEAN
--      (signature réellement appelée par app/api/scai/tts/route.ts)
--   4. reset mensuel reset_monthly_voice_credits() — appelé par le cron
--      (le 1er de chaque mois) pour recharger les crédits selon le plan :
--      empêche l'abus (plafond mensuel) SANS blocage définitif (recharge).
--   5. vue de compat user_voice_credits pour le frontend existant.
-- =================================================================

-- 1. Colonnes
alter table users_profiles add column if not exists voice_credits integer default 0;
alter table users_profiles add column if not exists voice_credits_used integer default 0;

-- 2. Backfill initial selon plan (le fondateur n'a pas de limite réelle)
update users_profiles set voice_credits = case
  when role = 'founder' then 9999
  when plan = 'pro'     then 300
  when plan = 'starter' then 60
  else 0 end
where voice_credits is null or voice_credits = 0;

-- 3. Nettoyer les anciennes versions conflictuelles puis créer la canonique
drop function if exists deduct_voice_credits(uuid, integer);
drop function if exists deduct_voice_credits(uuid, integer, integer);

create or replace function deduct_voice_credits(p_user_id uuid, p_amount integer)
returns boolean as $$
declare
  cur integer;
  is_founder boolean;
begin
  select voice_credits, (role = 'founder') into cur, is_founder
  from users_profiles where id = p_user_id for update;

  -- Le fondateur n'a aucune restriction de crédits.
  if is_founder then return true; end if;

  if cur is null or cur < p_amount then return false; end if;

  update users_profiles
  set voice_credits = voice_credits - p_amount,
      voice_credits_used = coalesce(voice_credits_used, 0) + p_amount
  where id = p_user_id;
  return true;
end;
$$ language plpgsql security definer;

-- 4. Reset mensuel — recharge les crédits selon le plan (anti-abus + anti-blocage)
create or replace function reset_monthly_voice_credits()
returns integer as $$
declare n integer;
begin
  update users_profiles set
    voice_credits = case
      when role = 'founder'                       then 9999
      when plan in ('premium', 'enterprise')      then 300  -- palier top
      when plan in ('pro', 'starter')             then 60   -- palier milieu
      else 0 end,
    voice_credits_used = 0
  where id is not null;   -- WHERE explicite requis (garde-fou Postgres/Supabase)
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer;

-- 5. Vue de compat : le frontend (Sidebar, InterviewSimulation) lit
--    user_voice_credits.credits_remaining — on la branche sur la source réelle.
drop table if exists user_voice_credits cascade;
drop view  if exists user_voice_credits;
create view user_voice_credits as
  select id as user_id, voice_credits as credits_remaining from users_profiles;
