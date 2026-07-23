-- =================================================================
-- RESTRUCTURE PLANS → Free / Pro / Premium (3 paliers)
-- =================================================================
-- Ancien modèle : free / starter / pro (+ legacy enterprise).
-- Nouveau (décision fondateur 22/07/2026) :
--   free    (inchangé)
--   pro     = ancien 'starter'  ($19 — palier milieu)
--   premium = ancien 'pro'      ($49 — palier top)
--
-- Ordre des opérations important : on élargit d'abord la contrainte pour
-- accepter les nouvelles valeurs, on migre les lignes existantes, PUIS on
-- resserre la contrainte sur le modèle final. Le fondateur (role=founder)
-- garde plan='free' mais bypasse tout côté code.
-- =================================================================

-- 1. Contrainte permissive temporaire (accepte ancien + nouveau)
alter table users_profiles drop constraint if exists users_profiles_plan_check;
alter table users_profiles add constraint users_profiles_plan_check
  check (plan in ('free', 'starter', 'pro', 'enterprise', 'premium'));

-- 2. Migration des lignes : pro→premium AVANT starter→pro (sinon collision)
update users_profiles set plan = 'premium'   where plan = 'pro';
update users_profiles set plan = 'pro'       where plan = 'starter';
update users_profiles set plan = 'premium'   where plan = 'enterprise';

-- 3. Contrainte finale sur le modèle à 3 paliers
alter table users_profiles drop constraint if exists users_profiles_plan_check;
alter table users_profiles add constraint users_profiles_plan_check
  check (plan in ('free', 'pro', 'premium'));

-- 4. Réaligner les crédits SCAI selon le nouveau plan (voix + scraping live)
--    Pro (ex-starter) : 60 · Premium (ex-pro) : 300 · founder illimité
update users_profiles set voice_credits = case
  when role = 'founder' then 9999
  when plan = 'premium' then 300
  when plan = 'pro'     then 60
  else 0 end
where id is not null;

-- 5. Colonne sent_via sur applications_sent : distingue candidature AUTO
--    (SCAI, comptée dans le quota auto-apply/jour) vs manuelle (illimitée).
alter table applications_sent add column if not exists sent_via text default 'manual';

-- 6. Reset QUOTIDIEN des crédits SCAI (voix + scraping live) — demandé par le
--    fondateur : les crédits se rechargent chaque jour selon le plan.
--    Free 5 · Pro 30 · Premium 100 · founder illimité.
create or replace function reset_daily_voice_credits()
returns integer as $$
declare n integer;
begin
  update users_profiles set
    voice_credits = case
      when role = 'founder'                  then 9999
      when plan in ('premium', 'enterprise') then 100
      when plan in ('pro', 'starter')        then 30
      else 5 end,
    voice_credits_used = 0
  where id is not null;
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer;
