// Client Supabase admin (clé service_role) — SERVEUR UNIQUEMENT.
// Ne jamais importer depuis un composant client : la clé contourne le RLS.
//
// Construit paresseusement (au premier appel réel, pas à l'import) : le
// Dockerfile ne passe QUE NEXT_PUBLIC_SUPABASE_URL/ANON_KEY comme build args
// à `npm run build` (SUPABASE_SERVICE_ROLE_KEY est un secret runtime, injecté
// par Render seulement quand le conteneur démarre — jamais pendant le build).
// Un appel createClient() au niveau module plantait donc le build entier
// (« supabaseKey is required ») dès que Next.js évalue les routes API
// pendant "Collecting page data" — confirmé en direct sur Render le
// 2026-09-14 (build_failed sur toutes les routes im­portant ce module).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('[supabaseAdmin] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  }
  client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
