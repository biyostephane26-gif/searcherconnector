-- Identifiants du fondateur pour les plateformes freelance verrouillées
-- derrière une connexion, hors Fiverr/Malt/Upwork (protection anti-bot
-- trop agressive, gérées via l'extension navigateur à la place — voir
-- listingConfigs.ts). Utilisé par le worker Playwright de lecture
-- programmée (platformSessionScraper.ts, appelé depuis scheduler.js)
-- pour alimenter cache_opportunities même quand le fondateur est hors
-- ligne. Risque de bannissement assumé par le fondateur, sur ses propres
-- comptes, sur des plateformes à protection anti-bot plus faible que le
-- trio exclu — décision du 2026-07-27.
--
-- password_encrypted : AES-256-GCM (voir credentialCrypto.ts), jamais en
-- clair, jamais exposé côté client — RLS founder-only, aucune policy
-- d'accès anonyme ou utilisateur standard.
CREATE TABLE IF NOT EXISTS platform_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL UNIQUE,
  login_url text NOT NULL,
  listing_url text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  -- Sélecteurs propres à ce site — aucune heuristique générique n'est
  -- fiable à cette échelle (chaque plateforme a sa structure HTML).
  -- { login: {user, pass, submit}, listing: {item, title, link, date} }
  selectors jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'login_failed', 'disabled')),
  last_login_at timestamptz,
  last_login_error text,
  last_scrape_at timestamptz,
  last_scrape_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_only_platform_credentials ON platform_credentials
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users_profiles WHERE id = auth.uid() AND role = 'founder')
  );
