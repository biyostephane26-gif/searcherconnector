-- Journal des actions de l'extension (autofill / autosubmit ATS)
CREATE TABLE IF NOT EXISTS public.extension_apply_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  url TEXT,
  site_type TEXT,
  mode TEXT,
  success BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extension_apply_logs_user ON public.extension_apply_logs(user_id);
