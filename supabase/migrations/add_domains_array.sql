-- =================================================================
-- Ajoute le support multi-domaines (max 3) — demandé pour que le
-- matching d'opportunités couvre plusieurs métiers à la fois, pas un
-- seul. `domain` (texte simple) reste en place et continue de valoir
-- le premier domaine de `domains` — tout le code existant qui lit
-- `profile.domain` (prompts IA, affichage, scoring find-worker/talent-
-- search...) continue de fonctionner sans changement.
-- =================================================================

alter table users_profiles
  add column if not exists domains text[] default '{}';

-- Backfill : les profils existants n'ont qu'un domaine → on le met dans domains
update users_profiles
set domains = array[domain]
where domain is not null and domain <> '' and (domains is null or domains = '{}');

-- Empêche plus de 3 domaines au niveau base (en plus du contrôle UI)
alter table users_profiles drop constraint if exists domains_max_3;
alter table users_profiles add constraint domains_max_3 check (array_length(domains, 1) is null or array_length(domains, 1) <= 3);
