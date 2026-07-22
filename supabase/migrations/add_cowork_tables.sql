-- =================================================================
-- Tables Cowork — référencées par le code (send.ts, inbox.ts) mais
-- jamais créées. oauth_connections extrait de couche 4.rtf (design
-- d'origine), les 3 autres reprises de src/lib/schema.sql.
-- =================================================================

create table if not exists oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  platform text not null check (
    platform in (
      'linkedin','gmail','google_drive','twitter_x',
      'facebook','whatsapp','telegram','discord',
      'github','upwork','reddit'
    )
  ),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamp,
  scope text,
  platform_user_id text,
  platform_username text,
  is_active boolean default true,
  last_used_at timestamp default now(),
  connected_at timestamp default now(),
  unique(user_id, platform)
);

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
  channel text,
  created_at timestamp default now()
);

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

alter table oauth_connections enable row level security;
alter table email_threads enable row level security;
alter table whatsapp_config enable row level security;
alter table whatsapp_messages enable row level security;

drop policy if exists "oauth_own" on oauth_connections;
create policy "oauth_own" on oauth_connections for all using (auth.uid() = user_id);

drop policy if exists "own_email_threads" on email_threads;
create policy "own_email_threads" on email_threads for all using (auth.uid() = user_id);

drop policy if exists "own_whatsapp_config" on whatsapp_config;
create policy "own_whatsapp_config" on whatsapp_config for all using (auth.uid() = user_id);

drop policy if exists "own_whatsapp_messages" on whatsapp_messages;
create policy "own_whatsapp_messages" on whatsapp_messages for all using (auth.uid() = user_id);
