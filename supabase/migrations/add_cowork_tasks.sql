-- =================================================================
-- cowork_tasks — vrai moteur multi-étapes de SCAI Cowork.
-- =================================================================
-- Avant : SCAI ne pouvait déclencher qu'UN outil par message (token
-- TOOL_READY), tout dans le cycle de vie de la requête HTTP. Cette
-- table permet à SCAI de planifier PLUSIEURS étapes réelles (ex:
-- prospecter des entreprises PUIS générer un PDF du résultat), qui
-- s'exécutent en arrière-plan (scheduler.js, déjà présent pour les
-- scans/emails) même si l'utilisateur ferme le chat.
create table if not exists cowork_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users_profiles(id) on delete cascade,
  title text not null,
  -- [{ tool, prompt, source?, status: 'pending'|'running'|'done'|'failed', output_id?, error? }]
  steps jsonb not null,
  current_step int not null default 0,
  status text not null default 'running' check (status in ('running','done','failed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cowork_tasks_user on cowork_tasks(user_id, created_at desc);
create index if not exists idx_cowork_tasks_running on cowork_tasks(status) where status = 'running';

alter table cowork_tasks enable row level security;

drop policy if exists "own_cowork_tasks" on cowork_tasks;
create policy "own_cowork_tasks" on cowork_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
