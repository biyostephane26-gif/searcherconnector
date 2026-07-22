// =================================================================
// SEARCHER CONNECTOR — API GESTION DES CLÉS (DASHBOARD)
// =================================================================
// Endpoints pour les utilisateurs (créer, lister, révoquer clés API)

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createApiKey, getUserApiKeys, revokeApiKey } from '../../../lib/api-keys';

// Authentification réelle via le token Supabase envoyé en Authorization —
// avant, cette route acceptait n'importe quel appel comme 'demo-user-id',
// sans jamais vérifier qui appelait (et importait next-auth, jamais installé).
async function getCurrentUserId(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST /api/user/api-keys → Créer une clé API
  if (req.method === 'POST') {
    const { name, plan = 'free' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const key = await createApiKey(userId, name, plan);
    return res.status(201).json(key);
  }

  // GET /api/user/api-keys → Lister les clés API de l'utilisateur
  if (req.method === 'GET') {
    const keys = await getUserApiKeys(userId);
    return res.status(200).json({ keys });
  }

  // DELETE /api/user/api-keys → Révoquer une clé API
  if (req.method === 'DELETE') {
    const { keyId } = req.body;
    if (!keyId) {
      return res.status(400).json({ error: 'keyId required' });
    }

    await revokeApiKey(userId, keyId);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
