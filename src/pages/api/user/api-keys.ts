// =================================================================
// SEARCHER CONNECTOR — API GESTION DES CLÉS (DASHBOARD)
// =================================================================
// Endpoints pour les utilisateurs (créer, lister, révoquer clés API)

import { NextApiRequest, NextApiResponse } from 'next';
import { createApiKey, getUserApiKeys, revokeApiKey } from '../../../lib/api-keys';
import { getServerSession } from 'next-auth/react'; // Tu devras ajuster avec ton auth système

// Note : Remplace la vérification de session par la tienne (Supabase, NextAuth, etc.)
async function getCurrentUserId(req: NextApiRequest): Promise<string | null> {
  // Pour l'exemple :
  return 'demo-user-id';
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
