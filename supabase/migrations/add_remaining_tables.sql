-- =================================================================
-- Tables restantes référencées par le code mais jamais créées.
-- agent_queue / interview_preps / user_voice_credits : reprises de
-- src/lib/schema.sql. comments / monitoring_events / support_tickets :
-- reconstruites depuis l'usage réel dans le code (jamais définies ailleurs).
-- =================================================================

create table if not exists agent_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  task_type text not null check (
    task_type in (
      'daily_scan','followup_check','response_monitor','salary_alert',
      'diversification_check','surveillance_scan','interview_prep_reminder',
      'whatsapp_check','email_check'
    )
  ),
  scheduled_for timestamp not null,
  priority integer default 5,
  status text default 'pending' check (status in ('pending','running','done','failed','cancelled')),
  attempts integer default 0,
  max_attempts integer default 3,
  payload jsonb default '{}',
  result jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists interview_preps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  interview_date timestamp,
  interview_type text check (interview_type in ('phone','video','in_person','technical','hr')),
  company_research text,
  likely_questions jsonb default '[]',
  suggested_answers jsonb default '[]',
  talking_points text,
  red_flags text,
  salary_strategy text,
  reminder_sent boolean default false,
  created_at timestamp default now()
);

create table if not exists user_voice_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  credits_remaining integer default 0,
  total_credits_used integer default 0,
  last_credit_reset_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references users_profiles(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);

create table if not exists monitoring_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source text,
  message text,
  user_id uuid references users_profiles(id) on delete set null,
  severity text default 'info',
  metadata jsonb default '{}',
  resolved boolean default false,
  created_at timestamp default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamp default now()
);

alter table agent_queue enable row level security;
alter table interview_preps enable row level security;
alter table user_voice_credits enable row level security;
alter table comments enable row level security;
alter table monitoring_events enable row level security;
alter table support_tickets enable row level security;

drop policy if exists "own_queue" on agent_queue;
create policy "own_queue" on agent_queue for all using (auth.uid() = user_id);

drop policy if exists "own_interview_preps" on interview_preps;
create policy "own_interview_preps" on interview_preps for all using (auth.uid() = user_id);

drop policy if exists "own_voice_credits" on user_voice_credits;
create policy "own_voice_credits" on user_voice_credits for all using (auth.uid() = user_id);

-- Commentaires : lecture publique (fil social), écriture par son auteur uniquement
drop policy if exists "read_all_comments" on comments;
create policy "read_all_comments" on comments for select using (true);
drop policy if exists "insert_own_comments" on comments;
create policy "insert_own_comments" on comments for insert with check (auth.uid() = author_id);
drop policy if exists "delete_own_comments" on comments;
create policy "delete_own_comments" on comments for delete using (auth.uid() = author_id);

-- monitoring_events / support_tickets : réservés au founder en lecture
drop policy if exists "founder_read_monitoring" on monitoring_events;
create policy "founder_read_monitoring" on monitoring_events
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));
drop policy if exists "founder_manage_monitoring" on monitoring_events;
create policy "founder_manage_monitoring" on monitoring_events
  for all using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "own_support_tickets" on support_tickets;
create policy "own_support_tickets" on support_tickets for select using (auth.uid() = user_id);
drop policy if exists "founder_read_support" on support_tickets;
create policy "founder_read_support" on support_tickets
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));
