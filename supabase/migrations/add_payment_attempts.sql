-- =================================================================
-- payment_attempts — table de suivi des paiements (Stripe/Flutterwave/
-- Monetbil/PayDunya), référencée par 3 routes mais jamais créée.
-- =================================================================
create table if not exists payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  plan text not null,
  method text,
  amount numeric,
  currency text,
  phone text,
  payment_ref text unique,
  status text default 'pending' check (status in ('pending','completed','failed')),
  transaction_id text,
  activated_at timestamp,
  created_at timestamp default now()
);

create index if not exists idx_payment_attempts_user on payment_attempts(user_id);
create index if not exists idx_payment_attempts_ref on payment_attempts(payment_ref);

alter table payment_attempts enable row level security;

drop policy if exists "own_payment_attempts" on payment_attempts;
create policy "own_payment_attempts" on payment_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "founder_read_all_payments" on payment_attempts;
create policy "founder_read_all_payments" on payment_attempts
  for select using (auth.uid() in (select id from users_profiles where role = 'founder'));
