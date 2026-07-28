-- Journal des lectures de pages de missions remontées par l'extension
-- (plateformes verrouillées derrière connexion : Comet, Crème de la Crème,
-- Kicklox, etc.) — sert au rate-limit anti-abus et à l'audit, pas de
-- stockage des missions elles-mêmes (ça va dans cache_opportunities).
CREATE TABLE IF NOT EXISTS extension_listing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_listing_submissions_user_time
  ON extension_listing_submissions(user_id, created_at);

ALTER TABLE extension_listing_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_extension_listing_submissions ON extension_listing_submissions
  FOR SELECT USING (auth.uid() = user_id);
