-- =================================================================
-- Token d'accès personnel pour l'extension navigateur.
-- L'extension ne doit JAMAIS voir le mot de passe ou la session
-- Supabase de l'utilisateur — un token opaque, généré depuis Settings,
-- révocable, sert uniquement à identifier l'utilisateur pour les
-- appels de l'extension (lecture profil + génération de message).
-- =================================================================

CREATE TABLE IF NOT EXISTS extension_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_profiles(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_extension_tokens_token ON extension_tokens(token);
CREATE INDEX IF NOT EXISTS idx_extension_tokens_user ON extension_tokens(user_id);

ALTER TABLE extension_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_extension_tokens_select" ON extension_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_extension_tokens_insert" ON extension_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_extension_tokens_delete" ON extension_tokens
  FOR DELETE USING (auth.uid() = user_id);
