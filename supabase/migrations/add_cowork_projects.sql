-- =================================================================
-- cowork_projects — dossiers de contexte de SCAI Cowork.
-- =================================================================
-- Avant : chaque conversation/sortie était isolée, sans façon de les
-- regrouper par objectif ("Recherche mission Data Analyst Berlin",
-- "Freelance design Q4"...). Un projet est un simple conteneur auquel
-- on peut rattacher des sorties (cowork_outputs.project_id) déjà
-- générées, pour les retrouver groupées plutôt que dans une seule
-- liste plate.
create table if not exists cowork_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users_profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create index if not exists idx_cowork_projects_user on cowork_projects(user_id, created_at desc);

alter table cowork_projects enable row level security;

drop policy if exists "own_cowork_projects" on cowork_projects;
create policy "own_cowork_projects" on cowork_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table cowork_outputs add column if not exists project_id uuid references cowork_projects(id) on delete set null;
create index if not exists idx_cowork_outputs_project on cowork_outputs(project_id);
