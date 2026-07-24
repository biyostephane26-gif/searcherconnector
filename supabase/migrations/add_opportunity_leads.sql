-- =================================================================
-- OPPORTUNITY CREATOR — persistance des leads (refonte)
-- =================================================================
-- Avant : chaque scan renvoyait 5 leads éphémères, jamais sauvegardés
-- (perdus au refresh), et rien n'empêchait de re-suggérer la même
-- entreprise à chaque scan. Un outil "indispensable" comme Cowork/
-- Claude Code doit construire un actif qui grandit dans le temps, pas
-- se réinitialiser à chaque usage. Cette table stocke chaque lead
-- trouvé, avec un statut de pipeline (new → contacted → replied → won)
-- géré par l'utilisateur, et sert de base au dédup entre scans.
-- =================================================================

create table if not exists opportunity_leads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users_profiles(id) on delete cascade,
  company_name      text not null,
  website           text,
  digital_score     integer,
  issues_detected   jsonb default '[]'::jsonb,
  budget_estimate   text,
  reply_chance      text,
  mockup_textuel    text,
  message_approche  text,
  status            text not null default 'new' check (status in ('new','contacted','replied','won','dead')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, company_name)
);

create index if not exists idx_opportunity_leads_user on opportunity_leads(user_id, created_at desc);

alter table opportunity_leads enable row level security;

drop policy if exists "own_opportunity_leads" on opportunity_leads;
create policy "own_opportunity_leads"
  on opportunity_leads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "founder_all_opportunity_leads" on opportunity_leads;
create policy "founder_all_opportunity_leads"
  on opportunity_leads for all
  using (is_founder());
