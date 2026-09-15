-- =================================================================
-- cowork_outputs — panneau "Sorties" de SCAI Cowork (persistant).
-- =================================================================
-- Avant : les fichiers générés (PDF/Excel/Word/image/vidéo) n'existaient
-- que dans l'état React local du chat — perdus au rechargement de la
-- page, jamais retrouvables ailleurs. Cette table donne un historique
-- réel, consultable indépendamment de la conversation qui les a créés.
create table if not exists cowork_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users_profiles(id) on delete cascade,
  kind text not null check (kind in ('pdf','xlsx','docx','image','video')),
  title text not null,
  file_url text,            -- stocké (PDF/Excel/Word/image) — chemin public du bucket DOCUMENTS
  status text not null default 'ready' check (status in ('processing','ready','failed')),
  meta jsonb default '{}',  -- ex. vidéo : { "job": "...", "provider": "..." } tant que status='processing'
  created_at timestamptz default now()
);

create index if not exists idx_cowork_outputs_user on cowork_outputs(user_id, created_at desc);

alter table cowork_outputs enable row level security;

drop policy if exists "own_cowork_outputs" on cowork_outputs;
create policy "own_cowork_outputs" on cowork_outputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
