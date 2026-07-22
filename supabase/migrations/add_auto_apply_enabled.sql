-- =================================================================
-- Interrupteur explicite pour l'auto-candidature (désactivé par défaut)
-- =================================================================
alter table agent_schedules
  add column if not exists auto_apply_enabled boolean not null default false;
