-- =================================================================
-- CORRECTIF CRITIQUE — le fondateur ne voyait pas les profils "pending"
-- =================================================================
-- Découvert le 24/07/2026 : un utilisateur réel (charlesassang007@gmail.com,
-- verification_status='pending', onboarding pas terminé) était invisible
-- dans le dashboard fondateur (onglet Utilisateurs), même avec la vraie
-- session authentifiée du fondateur. Testé en direct : la requête
-- SELECT sur users_profiles avec le JWT du fondateur ne renvoyait que
-- 4 lignes sur 5 — la policy RLS existante filtre probablement sur
-- verification_status et n'a jamais prévu de bypass pour role='founder'.
--
-- Le fondateur a demandé explicitement : "je n'ai aucune restriction,
-- je dois avoir accès à tout" — ceci s'applique aussi à la visibilité
-- des profils en base, pas seulement aux quotas applicatifs.
--
-- Fonction SECURITY DEFINER (pattern recommandé Supabase pour éviter
-- toute récursion RLS quand la policy interroge la même table).
-- =================================================================

create or replace function is_founder()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from users_profiles where id = auth.uid() and role = 'founder'
  );
$$;

-- Policies additionnelles (permissives → s'ajoutent en OR aux policies
-- existantes, ne retire aucune restriction déjà en place pour les autres
-- rôles) : le fondateur voit et modifie TOUS les profils, sans exception.
drop policy if exists "founder_select_all_profiles" on users_profiles;
create policy "founder_select_all_profiles"
  on users_profiles for select
  using (is_founder());

drop policy if exists "founder_update_all_profiles" on users_profiles;
create policy "founder_update_all_profiles"
  on users_profiles for update
  using (is_founder());
