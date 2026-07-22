-- =================================================================
-- Matching par niveau de compétence — l'IA évalue le niveau réel de
-- l'utilisateur (junior/mid/senior/expert) à partir de son profil
-- (bio, compétences, portfolio, missions), et chaque opportunité reçoit
-- un niveau requis détecté depuis son titre/description. Le score de
-- matching en tient compte, et les offres bien calibrées sont marquées
-- "recommandées".
-- =================================================================

-- `skills` était déjà collecté dans l'onboarding freelance (formData.skills)
-- mais jamais sauvegardé — aucune colonne n'existait pour ça.
alter table users_profiles
  add column if not exists skills text[] default '{}',
  add column if not exists skill_level text check (skill_level in ('junior','mid','senior','expert')),
  add column if not exists skill_level_reasoning text,
  add column if not exists skill_level_assessed_at timestamp;

alter table opportunities
  add column if not exists required_level text check (required_level in ('junior','mid','senior','expert') or required_level is null),
  add column if not exists recommended boolean default false;

-- cache-scan/route.ts écrit réellement dans cache_opportunities (le cache
-- partagé alimenté par le scheduler), pas dans opportunities — sans ce
-- second bloc, le matching par niveau ne s'appliquait jamais en pratique
-- même une fois les colonnes ci-dessus créées sur la mauvaise table.
alter table cache_opportunities
  add column if not exists required_level text check (required_level in ('junior','mid','senior','expert') or required_level is null),
  add column if not exists recommended boolean default false;
