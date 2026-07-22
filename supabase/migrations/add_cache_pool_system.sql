-- =================================================================
-- CACHE POOL SYSTEM — à exécuter une fois dans Supabase SQL Editor
-- (Repris de src/lib/schema.sql, jamais appliqué à la base live)
-- =================================================================

create table if not exists cache_opportunities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  title text not null,
  company text,
  location text,
  country text,
  salary_min integer,
  salary_max integer,
  currency text default 'USD',
  description text,
  original_url text not null,
  source_platform text not null,
  source_type text not null check (source_type in ('free','premium')),
  category text not null,
  published_at timestamp,
  applicants_count integer default 0,
  freshness_score numeric default 100,
  is_expired boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_cache_opp_category on cache_opportunities(category);
create index if not exists idx_cache_opp_source_type on cache_opportunities(source_type);
create index if not exists idx_cache_opp_freshness on cache_opportunities(freshness_score desc);
create index if not exists idx_cache_opp_fingerprint on cache_opportunities(fingerprint);

create table if not exists user_seen_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  cache_opportunity_id uuid references cache_opportunities(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('seen','saved','applied','dismissed')),
  created_at timestamp default now(),
  unique(user_id, cache_opportunity_id)
);

create table if not exists scraper_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamp default now(),
  ended_at timestamp,
  sources_scanned integer default 0,
  opportunities_found integer default 0,
  opportunities_added integer default 0,
  errors jsonb default '[]',
  status text default 'running' check (status in ('running','completed','failed')),
  category text,
  created_at timestamp default now()
);

create table if not exists founder_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  title text not null,
  message text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  is_read boolean default false,
  created_at timestamp default now()
);

alter table cache_opportunities enable row level security;
alter table user_seen_opportunities enable row level security;
alter table scraper_sessions enable row level security;
alter table founder_alerts enable row level security;

drop policy if exists "founder_read_all_cache" on cache_opportunities;
create policy "founder_read_all_cache" on cache_opportunities
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "authenticated_read_cache" on cache_opportunities;
create policy "authenticated_read_cache" on cache_opportunities
  for select using (auth.role() = 'authenticated');

drop policy if exists "founder_manage_all_cache" on cache_opportunities;
create policy "founder_manage_all_cache" on cache_opportunities
  for all using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "founder_read_all_scraper_sessions" on scraper_sessions;
create policy "founder_read_all_scraper_sessions" on scraper_sessions
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "founder_read_all_alerts" on founder_alerts;
create policy "founder_read_all_alerts" on founder_alerts
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "founder_manage_alerts" on founder_alerts;
create policy "founder_manage_alerts" on founder_alerts
  for all using (auth.uid() in (select id from users_profiles where role = 'founder'));

drop policy if exists "read_own_seen_opps" on user_seen_opportunities;
create policy "read_own_seen_opps" on user_seen_opportunities
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own_seen_opps" on user_seen_opportunities;
create policy "insert_own_seen_opps" on user_seen_opportunities
  for insert with check (auth.uid() = user_id);

-- NOTE : pas de pg_cron ici — le rafraîchissement du cache est piloté par
-- scheduler.js (Node, dans le conteneur Render), pas par Postgres.
-- C'est plus simple à déboguer et n'exige pas l'extension pg_net.
