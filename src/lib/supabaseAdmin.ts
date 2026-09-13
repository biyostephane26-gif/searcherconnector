// Client Supabase admin (clé service_role) — SERVEUR UNIQUEMENT.
// Ne jamais importer depuis un composant client : la clé contourne le RLS.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.warn('[supabaseAdmin] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
}

export const supabaseAdmin = createClient(url || '', serviceKey || '', {
  auth: { autoRefreshToken: false, persistSession: false },
})
