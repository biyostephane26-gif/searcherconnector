-- Extension UUID
create extension if not exists "uuid-ossp";

-- Table principale des profils
create table if not exists users_profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  email text not null,
  profile_type text not null check (
    profile_type in ('job_seeker','freelance','business','investor')
  ),
  domain text,
  country text,
  city text,
  languages text[],
  salary_min integer default 0,
  salary_max integer default 0,
  currency text default 'USD',
  bio text,
  avatar_url text,
  cv_url text,
  portfolio_url text,
  github_url text,
  behance_url text,
  youtube_url text,
  linkedin_url text,
  tiktok_url text,
  website_url text,
  verification_status text default 'pending' check (
    verification_status in ('pending','verified','genius','refused')
  ),
  refusal_reason text,
  plan text default 'free' check (
    plan in ('free','starter','pro','enterprise')
  ),
  role text default 'user' check (role in ('user','admin','founder')),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_expires_at timestamp,
  free_mode boolean default true,
  response_template text,
  surveillance_active boolean default false,
  salary_alert_threshold integer default 10,
  search_preferences jsonb default '{}',
  profile_completion integer default 0,
  referral_code text unique default substr(md5(random()::text), 1, 8),
  referred_by uuid references users_profiles(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Documents uploadés
create table if not exists uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  file_name text,
  created_at timestamp default now()
);

-- Opportunités trouvées par Searcher
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  title text not null,
  company text,
  location text,
  country text,
  salary_min integer default 0,
  salary_max integer default 0,
  currency text default 'USD',
  published_at timestamp,
  hours_ago integer default 0,
  applicants_count integer default 0,
  score integer default 0,
  match_reason text,
  source_platform text,
  original_url text,
  is_foreign boolean default false,
  is_suspicious boolean default false,
  visa_required boolean default false,
  passport_required boolean default false,
  status text default 'found' check (
    status in ('found','auto_applied','pending_action','response_received','dismissed')
  ),
  application_message text,
  alert_count integer default 0,
  last_alerted_at timestamp,
  created_at timestamp default now()
);

-- Candidatures envoyées
create table if not exists applications_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  company text,
  job_title text,
  cover_message text,
  cv_adapted text,
  visual_project_url text,
  applied_at timestamp default now(),
  response_received boolean default false,
  response_content text,
  response_draft text,
  response_status text default 'waiting'
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  type text not null,
  title text,
  message text not null,
  financial_value text,
  action_url text,
  action_label text,
  is_read boolean default false,
  requires_action boolean default false,
  dismissed boolean default false,
  alert_count integer default 0,
  created_at timestamp default now()
);

-- Réseau social : connexions
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id) on delete cascade,
  to_user_id uuid references users_profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamp default now(),
  unique(from_user_id, to_user_id)
);

-- Réseau social : publications
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users_profiles(id) on delete cascade,
  content text not null,
  image_url text,
  post_type text default 'general' check (
    post_type in ('general','article','opportunity_share','achievement','insight')
  ),
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  is_genius_post boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Likes sur les posts
create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users_profiles(id) on delete cascade,
  created_at timestamp default now(),
  unique(post_id, user_id)
);

-- Commentaires
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references users_profiles(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);

-- Messagerie directe
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id) on delete cascade,
  to_user_id uuid references users_profiles(id) on delete cascade,
  content text not null,
  media_url text,
  media_type text,
  is_read boolean default false,
  searcher_draft boolean default false,
  created_at timestamp default now()
);

-- Recommandations vérifiées
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id) on delete cascade,
  to_user_id uuid references users_profiles(id) on delete cascade,
  message text not null,
  is_verified boolean default true,
  gemini_authenticity_score integer default 0,
  created_at timestamp default now()
);

-- Comparateur salaires (cache)
create table if not exists salary_data (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  country text not null,
  salary_min integer,
  salary_median integer,
  salary_max integer,
  growth_percent numeric,
  currency text default 'USD',
  fetched_at timestamp default now()
);

-- Recherches sauvegardées
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  query text,
  domain text,
  country text,
  salary_min integer,
  salary_max integer,
  auto_repeat boolean default false,
  repeat_frequency text default 'daily',
  last_run_at timestamp,
  created_at timestamp default now()
);

-- Abonnements Stripe
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  plan text,
  status text,
  current_period_end timestamp,
  created_at timestamp default now()
);

-- Parrainage
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references users_profiles(id) on delete cascade,
  referred_id uuid references users_profiles(id) on delete cascade,
  reward_applied boolean default false,
  created_at timestamp default now()
);

-- Paramètres app (FREE_MODE, etc.)
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamp default now()
);
insert into app_settings (key, value) values ('FREE_MODE', 'true') on conflict do nothing;

-- Entretiens planifiés
create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  company text,
  job_title text,
  interview_at timestamp,
  timezone text,
  format text check (format in ('video','phone','in_person')),
  meeting_url text,
  notes text,
  preparation_done boolean default false,
  status text default 'scheduled' check (
    status in ('scheduled','completed','cancelled')
  ),
  created_at timestamp default now()
);

-- Log des actions de Searcher
create table if not exists searcher_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  action_type text not null,
  description text not null,
  platform text,
  result text,
  auto_promo_sent boolean default false,
  created_at timestamp default now()
);

-- RLS : activer sur toutes les tables
alter table users_profiles enable row level security;
alter table uploaded_documents enable row level security;
alter table opportunities enable row level security;
alter table applications_sent enable row level security;
alter table notifications enable row level security;
alter table connections enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table messages enable row level security;
alter table recommendations enable row level security;
alter table salary_data enable row level security;
alter table saved_searches enable row level security;
alter table subscriptions enable row level security;
alter table referrals enable row level security;
alter table interviews enable row level security;
alter table searcher_logs enable row level security;

-- Policies users_profiles
create policy "insert_own_profile" on users_profiles
  for insert with check (auth.uid() = id);
create policy "select_own_profile" on users_profiles
  for select using (auth.uid() = id);
create policy "update_own_profile" on users_profiles
  for update using (auth.uid() = id);
create policy "select_verified_profiles" on users_profiles
  for select using (verification_status in ('verified','genius'));

-- Policies documents
create policy "insert_own_docs" on uploaded_documents
  for insert with check (auth.uid() = user_id);
create policy "select_own_docs" on uploaded_documents
  for select using (auth.uid() = user_id);

-- Policies opportunities
create policy "manage_own_opps" on opportunities
  for all using (auth.uid() = user_id);

-- Policies applications
create policy "manage_own_apps" on applications_sent
  for all using (auth.uid() = user_id);

-- Policies notifications
create policy "manage_own_notifs" on notifications
  for all using (auth.uid() = user_id);

-- Policies connections
create policy "manage_own_connections" on connections
  for all using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Policies posts (tous les vérifiés peuvent lire)
create policy "insert_own_posts" on posts
  for insert with check (auth.uid() = author_id);
create policy "select_all_posts" on posts
  for select using (true);
create policy "update_own_posts" on posts
  for update using (auth.uid() = author_id);
create policy "delete_own_posts" on posts
  for delete using (auth.uid() = author_id);

-- Policies likes
create policy "manage_likes" on post_likes
  for all using (auth.uid() = user_id);

-- Policies commentaires
create policy "manage_comments" on post_comments
  for all using (auth.uid() = author_id);
create policy "read_comments" on post_comments
  for select using (true);

-- Policies messages
create policy "manage_messages" on messages
  for all using (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );

-- Policies recommandations
create policy "manage_recs" on recommendations
  for all using (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );
create policy "read_recs" on recommendations
  for select using (true);

-- Policies salary
create policy "read_salary" on salary_data
  for select using (true);
create policy "insert_salary" on salary_data
  for insert with check (true);

-- Policies saved searches
create policy "manage_saved_searches" on saved_searches
  for all using (auth.uid() = user_id);

-- Policies subscriptions
create policy "manage_own_subs" on subscriptions
  for all using (auth.uid() = user_id);

-- Policies referrals
create policy "manage_referrals" on referrals
  for all using (
    auth.uid() = referrer_id or auth.uid() = referred_id
  );

-- Policies interviews
create policy "manage_interviews" on interviews
  for all using (auth.uid() = user_id);

-- Policies logs
create policy "manage_logs" on searcher_logs
  for all using (auth.uid() = user_id);

-- App settings lisibles par tous
create policy "read_settings" on app_settings
  for select using (true);

-- =================================================================
-- COUCHE 3 : AGENT AUTONOME
-- =================================================================

-- Logs de toutes les actions autonomes de Searcher
create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  action_type text not null check (
    action_type in (
      'search_scan',
      'auto_apply',
      'email_response',
      'whatsapp_response',
      'alert_sent',
      'cv_adapted',
      'cover_generated',
      'diversification_warning',
      'international_alert',
      'surveillance_check',
      'salary_monitor',
      'schedule_interview_prep',
      'follow_up_sent'
    )
  ),
  opportunity_id uuid references opportunities(id) on delete set null,
  input_data jsonb default '{}',
  output_data jsonb default '{}',
  result text,
  success boolean default true,
  error_message text,
  auto_promo_sent boolean default false,
  execution_ms integer default 0,
  created_at timestamp default now()
);

-- Queue des tâches planifiées pour l'agent
create table if not exists agent_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  task_type text not null check (
    task_type in (
      'daily_scan',
      'followup_check',
      'response_monitor',
      'salary_alert',
      'diversification_check',
      'surveillance_scan',
      'interview_prep_reminder',
      'whatsapp_check',
      'email_check'
    )
  ),
  scheduled_for timestamp not null,
  priority integer default 5,
  status text default 'pending' check (
    status in ('pending','running','done','failed','cancelled')
  ),
  attempts integer default 0,
  max_attempts integer default 3,
  payload jsonb default '{}',
  result jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Templates de réponse personnalisés par utilisateur
create table if not exists response_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  template_type text not null check (
    template_type in (
      'initial_response',
      'follow_up_1',
      'follow_up_2',
      'interview_confirm',
      'offer_received',
      'salary_negotiation',
      'decline_politely',
      'thank_you'
    )
  ),
  subject_template text,
  body_template text not null,
  tone text default 'professional' check (
    tone in ('professional','friendly','assertive','enthusiastic')
  ),
  generated_by text default 'claude',
  is_active boolean default true,
  uses_count integer default 0,
  created_at timestamp default now()
);

-- Suivi des emails entrants/sortants
create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  thread_id text,
  subject text,
  from_email text,
  from_name text,
  company text,
  direction text not null check (direction in ('incoming','outgoing')),
  body_preview text,
  full_body text,
  searcher_replied boolean default false,
  reply_body text,
  reply_sent_at timestamp,
  reply_approved_by_user boolean default false,
  requires_human boolean default false,
  sentiment text check (sentiment in ('positive','neutral','negative','unknown')),
  created_at timestamp default now()
);

-- Messages de chat avec l'agent SCAI
create table if not exists agent_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  role text not null check (role in ('agent', 'user')),
  content text not null,
  thought text,
  created_at timestamp default now()
);

-- RLS
alter table agent_chat_messages enable row level security;
create policy "own_agent_chat" on agent_chat_messages
  for all using (auth.uid() = user_id);

-- Connexion WhatsApp de l'utilisateur
create table if not exists whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  phone_number text not null,
  is_active boolean default false,
  webhook_verified boolean default false,
  access_token_encrypted text,
  last_message_at timestamp,
  messages_handled integer default 0,
  created_at timestamp default now()
);

-- Messages WhatsApp gérés par l'agent
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  wa_message_id text unique,
  from_number text,
  from_name text,
  body text,
  direction text check (direction in ('incoming','outgoing')),
  searcher_replied boolean default false,
  reply_body text,
  reply_sent_at timestamp,
  requires_human boolean default false,
  created_at timestamp default now()
);

-- Suivi des follow-ups automatiques
create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  application_id uuid references applications_sent(id) on delete cascade,
  followup_number integer default 1,
  scheduled_for timestamp,
  sent_at timestamp,
  body text,
  channel text check (channel in ('email','whatsapp','platform')),
  status text default 'scheduled' check (
    status in ('scheduled','sent','replied','cancelled')
  ),
  created_at timestamp default now()
);

-- Préparation aux entretiens
create table if not exists interview_preps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  interview_date timestamp,
  interview_type text check (
    interview_type in ('phone','video','in_person','technical','hr')
  ),
  company_research text,
  likely_questions jsonb default '[]',
  suggested_answers jsonb default '[]',
  talking_points text,
  red_flags text,
  salary_strategy text,
  reminder_sent boolean default false,
  created_at timestamp default now()
);

-- Configuration du scheduler par utilisateur
create table if not exists agent_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  scan_frequency_hours integer default 6,
  scan_times text[] default array['07:00','13:00','19:00'],
  followup_delay_days integer default 3,
  max_followups integer default 2,
  auto_apply_threshold integer default 80,
  require_approval_below integer default 70,
  surveillance_active boolean default false,
  surveillance_threshold_percent integer default 15,
  email_auto_reply boolean default false,
  whatsapp_auto_reply boolean default false,
  quiet_hours_start text default '22:00',
  quiet_hours_end text default '07:00',
  timezone text default 'Africa/Douala',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS
alter table agent_actions enable row level security;
alter table agent_queue enable row level security;
alter table response_templates enable row level security;
alter table email_threads enable row level security;
alter table whatsapp_config enable row level security;
alter table whatsapp_messages enable row level security;
alter table followups enable row level security;
alter table interview_preps enable row level security;
alter table agent_schedules enable row level security;

create policy "own_agent_actions" on agent_actions
  for all using (auth.uid() = user_id);

create policy "own_queue" on agent_queue
  for all using (auth.uid() = user_id);

create policy "own_templates" on response_templates
  for all using (auth.uid() = user_id);

create policy "own_email_threads" on email_threads
  for all using (auth.uid() = user_id);

create policy "own_whatsapp_config" on whatsapp_config
  for all using (auth.uid() = user_id);

create policy "own_whatsapp_messages" on whatsapp_messages
  for all using (auth.uid() = user_id);

create policy "own_followups" on followups
  for all using (auth.uid() = user_id);

create policy "own_interview_preps" on interview_preps
  for all using (auth.uid() = user_id);

create policy "own_schedules" on agent_schedules
  for all using (auth.uid() = user_id);

-- Supabase Cron : activer pg_cron
create extension if not exists pg_cron;

-- Cron job : marquer les tâches overdue
select cron.schedule(
  'agent-queue-cleanup',
  '*/15 * * * *',
  $$
    update agent_queue
    set status = 'failed', updated_at = now()
    where status = 'running'
      and updated_at < now() - interval '30 minutes';
  $$
);

-- Cron job : créer les scans quotidiens pour tous les utilisateurs actifs
select cron.schedule(
  'create-daily-scans',
  '0 6 * * *',
  $$
    insert into agent_queue (user_id, task_type, scheduled_for, priority)
    select id, 'daily_scan', now(), 10
    from users_profiles
    where verification_status in ('verified','genius')
      and surveillance_active = true
    on conflict do nothing;
  $$
);

-- =================================================================
-- CACHE POOL SYSTEM
-- =================================================================

-- Table principale des missions cachées
create table if not exists cache_opportunities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique, -- (title + source + date) hash
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
  category text not null, -- e.g., 'dev', 'marketing', 'design', 'finance'
  published_at timestamp,
  applicants_count integer default 0,
  freshness_score numeric default 100, -- diminue avec le temps
  is_expired boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Index pour performance
create index if not exists idx_cache_opp_category on cache_opportunities(category);
create index if not exists idx_cache_opp_source_type on cache_opportunities(source_type);
create index if not exists idx_cache_opp_freshness on cache_opportunities(freshness_score desc);
create index if not exists idx_cache_opp_fingerprint on cache_opportunities(fingerprint);

-- Historique des missions vues par utilisateur
create table if not exists user_seen_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  cache_opportunity_id uuid references cache_opportunities(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('seen','saved','applied','dismissed')),
  created_at timestamp default now(),
  unique(user_id, cache_opportunity_id)
);

-- Logs des sessions de scraping
create table if not exists scraper_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamp default now(),
  ended_at timestamp,
  sources_scanned integer default 0,
  opportunities_found integer default 0,
  opportunities_added integer default 0,
  errors jsonb default '[]',
  status text default 'running' check (status in ('running','completed','failed')),
  created_at timestamp default now()
);

-- Table pour les alerts fondateur (source down, quota dépassé, etc.)
create table if not exists founder_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  title text not null,
  message text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  is_read boolean default false,
  created_at timestamp default now()
);

-- RLS pour le Founder Dashboard
alter table cache_opportunities enable row level security;
alter table user_seen_opportunities enable row level security;
alter table scraper_sessions enable row level security;
alter table founder_alerts enable row level security;

-- Policies Founder Dashboard
create policy "founder_read_all_cache" on cache_opportunities
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

create policy "founder_manage_all_cache" on cache_opportunities
  for all using (auth.uid() in (select id from users_profiles where role = 'founder'));

create policy "founder_read_all_scraper_sessions" on scraper_sessions
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

create policy "founder_read_all_alerts" on founder_alerts
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));

create policy "founder_manage_alerts" on founder_alerts
  for all using (auth.uid() in (select id from users_profiles where role = 'founder'));

-- Policy pour les users sur leurs vues
create policy "read_own_seen_opps" on user_seen_opportunities
  for select using (auth.uid() = user_id);

create policy "insert_own_seen_opps" on user_seen_opportunities
  for insert with check (auth.uid() = user_id);

-- =================================================================
-- TABLE DES CREDITS VOCAUX
-- =================================================================

create table if not exists user_voice_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  credits_remaining integer default 0,
  total_credits_used integer default 0,
  last_credit_reset_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table user_voice_credits enable row level security;
create policy "manage_own_voice_credits" on user_voice_credits
  for all using (auth.uid() = user_id);

-- Cron job : scraper toutes les sources toutes les 30 minutes
select cron.schedule(
  'run-cache-scraper',
  '*/30 * * * *',
  $$
    -- Appeler l'API de scraping via pg_net (à configurer)
    -- Pour l'instant, placeholder pour l'implémentation
    insert into scraper_sessions (status) values ('running');
  $$
);

-- Cron job : mettre à jour le score de fraîcheur quotidiennement
select cron.schedule(
  'update-freshness-scores',
  '0 0 * * *',
  $$
    update cache_opportunities
    set freshness_score = greatest(0, 100 - (extract(day from age(now(), created_at)) * 14.28))
    where not is_expired;
    
    -- Marquer comme expiré si > 7 jours ou > 30 postulants
    update cache_opportunities
    set is_expired = true
    where (created_at < now() - interval '7 days' or applicants_count > 30)
      and not is_expired;
  $$
);

-- Purge des anciennes missions expirées chaque semaine
select cron.schedule(
  'purge-expired-opportunities',
  '0 0 * * 0',
  $$
    delete from cache_opportunities
    where is_expired and created_at < now() - interval '30 days';
  $$
);
